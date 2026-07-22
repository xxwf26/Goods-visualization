/**
 * 灵感采集候选控制器
 * 候选队列：pending(待复核) → adopted(转正进 inspiration) / rejected(丢弃)，rejected 可 restore。
 * P1 仅含复核闭环（手动造候选 + 转正/丢弃/恢复）；P2 接入关键词爬虫入队，P3 接入 AI 预筛。
 * 详见 docs/灵感采集设计方案.md
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')
const MetaFetcher = require('../services/MetaFetcher')
const { downloadImage } = require('../utils/imageDownload')
const { isSensitiveSource } = require('../utils/urlSafety')
const XhsCrawlerService = require('../services/XhsCrawlerService')

const STATUSES = ['pending', 'adopted', 'rejected']

class CandidateController {
  /**
   * 候选列表 GET /api/candidates?status=pending&page=&pageSize=&keyword=
   * 排序：AI 分降序（未打分沉底）→ 最新在前
   */
  async list(req, res, next) {
    try {
      const { status = 'pending', keyword, crawl_run_id } = req.query
      const page = parseInt(req.query.page) || 1
      const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100)
      const offset = (page - 1) * pageSize

      const conds = []
      const params = []
      if (status && STATUSES.includes(status)) { conds.push('c.status = ?'); params.push(status) }
      if (crawl_run_id) { conds.push('c.crawl_run_id = ?'); params.push(crawl_run_id) }
      if (keyword) {
        conds.push('(c.title LIKE ? OR c.keyword LIKE ? OR c.author LIKE ?)')
        const kw = `%${keyword}%`
        params.push(kw, kw, kw)
      }
      const whereClause = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

      const countRows = await db.query(`SELECT COUNT(*) AS total FROM inspiration_candidate c ${whereClause}`, params)
      const total = countRows[0].total

      const listSql = `
        SELECT c.id, c.crawl_run_id, c.keyword, c.source_platform, c.source_url,
               c.title, c.author, c.author_url, c.cover_image, c.post_tags, c.description,
               c.like_count, c.save_count, c.comment_count,
               c.ai_score, c.ai_reason, c.ai_category,
               c.dedup_inspiration_id, c.status, c.promoted_id, c.created_at,
               u.nickname AS reviewer_name
        FROM inspiration_candidate c
        LEFT JOIN sys_user u ON c.reviewed_by = u.id
        ${whereClause}
        ORDER BY (c.ai_score IS NULL) ASC, c.ai_score DESC, c.id DESC
        LIMIT ? OFFSET ?
      `
      const list = await db.query(listSql, [...params, pageSize, offset])

      res.json(Response.success({
        list,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      }))
    } catch (error) { next(error) }
  }

  /**
   * 各状态计数 GET /api/candidates/counts
   */
  async counts(req, res, next) {
    try {
      const rows = await db.query(
        `SELECT status, COUNT(*) AS c FROM inspiration_candidate GROUP BY status`
      )
      const out = { pending: 0, adopted: 0, rejected: 0 }
      rows.forEach(r => { if (out[r.status] !== undefined) out[r.status] = r.c })
      res.json(Response.success(out))
    } catch (error) { next(error) }
  }

  /**
   * 候选详情 GET /api/candidates/:id
   */
  async detail(req, res, next) {
    try {
      const rows = await db.query(
        `SELECT c.*, u.nickname AS reviewer_name
         FROM inspiration_candidate c
         LEFT JOIN sys_user u ON c.reviewed_by = u.id
         WHERE c.id = ?`, [req.params.id]
      )
      if (!rows.length) return res.status(404).json(Response.notFound('候选不存在'))
      res.json(Response.success(rows[0]))
    } catch (error) { next(error) }
  }

  /**
   * 手动新增候选 POST /api/candidates
   * P1 用于验证复核链路（贴链接造候选）；P2 爬虫走内部入队不走此接口。
   * 抓取失败/不达标不阻断——尽量存下 source_url 供人工复核。
   */
  async createManual(req, res, next) {
    try {
      const v = validate(req.body).required(['source_url']).maxLength('source_url', 1000)
      if (!v.validate()) return res.status(400).json(Response.badRequest(v.getFirstError()))

      const { source_url, keyword = null } = req.body

      // 去重：vs 历史候选（硬跳过）
      const dup = await db.query('SELECT id, status FROM inspiration_candidate WHERE source_url = ? LIMIT 1', [source_url])
      if (dup.length) {
        return res.status(400).json(Response.badRequest(`该链接已在候选队列（#${dup[0].id}，状态：${dup[0].status}）`))
      }

      // 抓取元数据自动填充（复用灵感库同款 MetaFetcher）
      let meta = {}
      try { meta = await MetaFetcher.fetch(source_url) || {} } catch { meta = {} }
      const sensitive = isSensitiveSource(source_url)

      // 下载封面到本地（失败存 null，不存远程链）
      let coverImage = null
      if (meta.image && !sensitive) {
        try { coverImage = await downloadImage(meta.image, 'cover') } catch { coverImage = null }
      }
      const images = (!sensitive && meta.allImages?.length) ? meta.allImages.join(',') : null

      // vs 已有灵感去重（软提示）
      let dedupId = null
      const existed = await db.query('SELECT id FROM inspiration WHERE source_url = ? AND is_delete = 0 LIMIT 1', [source_url])
      if (existed.length) dedupId = existed[0].id

      const result = await db.query(
        `INSERT INTO inspiration_candidate
          (crawl_run_id, keyword, source_platform, source_url, title, author, author_url,
           cover_image, images, post_tags, description, like_count, save_count, comment_count,
           dedup_inspiration_id, status, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          keyword,
          meta.platform || '小红书',
          source_url,
          meta.title || null,
          meta.author || null,
          null, // MetaFetcher 不返回 author_url
          coverImage,
          images,
          meta.tags?.length ? meta.tags.join(',') : null,
          meta.description || null,
          meta.likeCount || null,
          meta.saveCount || null,
          meta.commentCount || null,
          dedupId
        ]
      )
      res.json(Response.success({ id: result.insertId, dedup_inspiration_id: dedupId },
        dedupId ? '已入候选队列（注意：疑似与已有灵感重复）' : '已入候选队列'))
    } catch (error) { next(error) }
  }

  /**
   * 转正 POST /api/candidates/:id/adopt
   * 事务：INSERT inspiration + 候选标 adopted。转正前可传字段覆盖（分类/标签/标题等）。
   */
  async adopt(req, res, next) {
    try {
      const id = req.params.id
      const rows = await db.query('SELECT * FROM inspiration_candidate WHERE id = ?', [id])
      if (!rows.length) return res.status(404).json(Response.notFound('候选不存在'))
      const c = rows[0]
      if (c.status === 'adopted') return res.status(400).json(Response.badRequest('该候选已转正，不可重复操作'))

      // 转正前可覆盖的字段（复核弹窗提交）
      const o = req.body || {}
      const title = o.title || c.title || '未命名灵感'
      const inspirationType = o.inspiration_type || c.ai_category || 'peripheral'
      const categories = o.categories || c.ai_category || null
      const ipTagIds = o.ip_tag_ids || null
      const categoryTagIds = o.category_tag_ids || null
      const craftTagIds = o.craft_tag_ids || null
      const sceneTagIds = o.scene_tag_ids || null

      const newId = await db.transaction(async (conn) => {
        const [ins] = await conn.query(
          `INSERT INTO inspiration (
             title, inspiration_type, categories, source_type, source_platform, source_name, source_url, link,
             author, author_url, ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
             description, post_tags, cover_image, images,
             like_count, save_count, comment_count,
             collection_status, create_user_id, create_time, update_time, is_delete
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uncollected', ?, NOW(), NOW(), 0)`,
          [
            title, inspirationType, categories, c.source_platform, c.source_platform, c.keyword,
            c.source_url, c.source_url, c.author, c.author_url,
            ipTagIds, categoryTagIds, craftTagIds, sceneTagIds,
            c.description, c.post_tags, c.cover_image, c.images,
            c.like_count, c.save_count, c.comment_count,
            req.user?.id
          ]
        )
        const inspirationId = ins.insertId
        await conn.query(
          `UPDATE inspiration_candidate SET status = 'adopted', reviewed_by = ?, promoted_id = ? WHERE id = ?`,
          [req.user?.id, inspirationId, id]
        )
        return inspirationId
      })

      res.json(Response.success({ inspiration_id: newId }, '已转正进灵感库'))
    } catch (error) { next(error) }
  }

  /**
   * 丢弃 POST /api/candidates/:id/reject（软丢弃，只翻状态）
   */
  async reject(req, res, next) {
    try {
      const rows = await db.query('SELECT status FROM inspiration_candidate WHERE id = ?', [req.params.id])
      if (!rows.length) return res.status(404).json(Response.notFound('候选不存在'))
      if (rows[0].status === 'adopted') return res.status(400).json(Response.badRequest('已转正的候选不可丢弃'))
      await db.query(
        `UPDATE inspiration_candidate SET status = 'rejected', reviewed_by = ? WHERE id = ?`,
        [req.user?.id, req.params.id]
      )
      res.json(Response.success(null, '已丢弃'))
    } catch (error) { next(error) }
  }

  /**
   * 恢复 POST /api/candidates/:id/restore（rejected → pending；adopted 不可逆）
   */
  async restore(req, res, next) {
    try {
      const rows = await db.query('SELECT status FROM inspiration_candidate WHERE id = ?', [req.params.id])
      if (!rows.length) return res.status(404).json(Response.notFound('候选不存在'))
      if (rows[0].status === 'adopted') return res.status(400).json(Response.badRequest('已转正的候选不可恢复（已生成正式灵感）'))
      if (rows[0].status === 'pending') return res.json(Response.success(null, '候选已是待复核状态'))
      await db.query(`UPDATE inspiration_candidate SET status = 'pending', reviewed_by = NULL WHERE id = ?`, [req.params.id])
      res.json(Response.success(null, '已恢复到待复核'))
    } catch (error) { next(error) }
  }

  // ============ 关键词采集（P2） ============

  /**
   * 发起采集 POST /api/candidates/crawl { keywords, limit }
   * 立即返回 runId，后台异步跑。
   */
  async startCrawl(req, res, next) {
    try {
      const { keywords, limit } = req.body
      if (!keywords || (Array.isArray(keywords) && !keywords.length)) {
        return res.status(400).json(Response.badRequest('请提供关键词'))
      }
      const { runId } = await XhsCrawlerService.startCrawl({
        keywords,
        limit: Math.min(parseInt(limit) || 60, 200),
        userId: req.user?.id
      })
      res.json(Response.success({ run_id: runId }, '采集已启动，正在后台运行'))
    } catch (error) {
      res.status(400).json(Response.badRequest(error.message || '采集启动失败'))
    }
  }

  /**
   * 采集批次状态 GET /api/candidates/crawl/:runId
   */
  async crawlStatus(req, res, next) {
    try {
      const run = await XhsCrawlerService.getRun(req.params.runId)
      if (!run) return res.status(404).json(Response.notFound('批次不存在'))
      res.json(Response.success(run))
    } catch (error) { next(error) }
  }

  /**
   * 采集批次列表 GET /api/candidates/crawl-runs
   */
  async crawlRuns(req, res, next) {
    try {
      res.json(Response.success(await XhsCrawlerService.listRuns(20)))
    } catch (error) { next(error) }
  }

  /**
   * 小红书扫码登录 POST /api/candidates/xhs-login（阻塞，弹出浏览器窗口扫码）
   */
  async xhsLogin(req, res, next) {
    try {
      const out = await XhsCrawlerService.runLoginProcess()
      if (out.success) res.json(Response.success(null, '登录成功，cookie 已保存'))
      else res.status(400).json(Response.badRequest(out.error || '登录失败'))
    } catch (error) { next(error) }
  }

  /**
   * cookie 状态 GET /api/candidates/xhs-cookie-status（只返回是否已配置，不回传明文）
   */
  async xhsCookieStatus(req, res, next) {
    try {
      const cookie = await XhsCrawlerService.getCookie()
      res.json(Response.success({ configured: !!cookie }))
    } catch (error) { next(error) }
  }

  // ============ AI 预筛 + 批量（P3） ============

  /**
   * 给未打分的待复核候选补打分 POST /api/candidates/score-pending
   * 用于爬取时打分失败、或改了打分口径后重打。逐条打分（AI 无 key 则跳过）。
   */
  async scorePending(req, res, next) {
    try {
      const AiAnalyzer = require('../services/AiAnalyzer')
      const onlyUnscored = req.body?.mode !== 'all' // 默认只打未打分的
      const rows = await db.query(
        `SELECT id, title, description, post_tags FROM inspiration_candidate
         WHERE status = 'pending' ${onlyUnscored ? 'AND ai_score IS NULL' : ''}
         ORDER BY id DESC LIMIT 100`
      )
      let scored = 0
      for (const c of rows) {
        const s = await AiAnalyzer.scoreCandidate(c)
        if (s) {
          await db.query('UPDATE inspiration_candidate SET ai_score=?, ai_reason=?, ai_category=? WHERE id=?', [s.score, s.reason, s.category, c.id])
          scored++
        }
      }
      res.json(Response.success({ total: rows.length, scored }, `已打分 ${scored}/${rows.length} 条`))
    } catch (error) { next(error) }
  }

  /**
   * 批量转正 POST /api/candidates/batch-adopt { minScore }
   * 转正所有 pending 且 ai_score >= minScore 的候选。跳过 dedup 命中的（强制人工决策）。
   */
  async batchAdopt(req, res, next) {
    try {
      const minScore = parseInt(req.body?.minScore)
      if (isNaN(minScore)) return res.status(400).json(Response.badRequest('请提供分数阈值 minScore'))
      const rows = await db.query(
        `SELECT * FROM inspiration_candidate
         WHERE status = 'pending' AND dedup_inspiration_id IS NULL AND ai_score >= ?`,
        [minScore]
      )
      let done = 0
      for (const c of rows) {
        try {
          await db.transaction(async (conn) => {
            const [ins] = await conn.query(
              `INSERT INTO inspiration (
                 title, inspiration_type, categories, source_type, source_platform, source_name, source_url, link,
                 author, author_url, description, post_tags, cover_image, images,
                 like_count, save_count, comment_count, collection_status, create_user_id, create_time, update_time, is_delete
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uncollected', ?, NOW(), NOW(), 0)`,
              [
                c.title || '未命名灵感', c.ai_category || 'peripheral', c.ai_category || null,
                c.source_platform, c.source_platform, c.keyword, c.source_url, c.source_url,
                c.author, c.author_url, c.description, c.post_tags, c.cover_image, c.images,
                c.like_count, c.save_count, c.comment_count, req.user?.id
              ]
            )
            await conn.query(`UPDATE inspiration_candidate SET status='adopted', reviewed_by=?, promoted_id=? WHERE id=?`, [req.user?.id, ins.insertId, c.id])
          })
          done++
        } catch (e) { console.error(`[batch-adopt] 候选 ${c.id} 转正失败:`, e.message) }
      }
      res.json(Response.success({ matched: rows.length, adopted: done }, `已转正 ${done} 条（≥${minScore}分，已跳过疑似重复）`))
    } catch (error) { next(error) }
  }

  /**
   * 批量丢弃 POST /api/candidates/batch-reject { maxScore }
   * 丢弃所有 pending 且 ai_score < maxScore 的候选。
   */
  async batchReject(req, res, next) {
    try {
      const maxScore = parseInt(req.body?.maxScore)
      if (isNaN(maxScore)) return res.status(400).json(Response.badRequest('请提供分数阈值 maxScore'))
      const result = await db.query(
        `UPDATE inspiration_candidate SET status='rejected', reviewed_by=?
         WHERE status='pending' AND ai_score IS NOT NULL AND ai_score < ?`,
        [req.user?.id, maxScore]
      )
      res.json(Response.success({ rejected: result.affectedRows }, `已丢弃 ${result.affectedRows} 条（<${maxScore}分）`))
    } catch (error) { next(error) }
  }
}

module.exports = new CandidateController()
