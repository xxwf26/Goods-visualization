/**
 * 小红书关键词采集服务
 * 起 Playwright 子进程按关键词搜最新帖 → 去重 → 下载封面 → 写入候选队列（pending）。
 * cookie/登录态：搜索脚本优先用 <cwd>/.xhs-auth.json（扫码登录保存），回退 system_setting 里的 xhs_cookie。
 * 详见 docs/灵感采集设计方案.md
 */
const { execFile } = require('node:child_process')
const path = require('node:path')
const db = require('../config/database')
const { downloadImage } = require('../utils/imageDownload')
const AiAnalyzer = require('./AiAnalyzer')

const SEARCH_SCRIPT = path.join(__dirname, '../scripts/xhs-search.mjs')
const LOGIN_SCRIPT = path.join(__dirname, '../scripts/xhs-login.mjs')

// 内存标记：正在跑的批次，避免同一进程内重复触发
const runningRuns = new Set()

class XhsCrawlerService {
  /** 读小红书 cookie（system_setting.xhs_cookie） */
  static async getCookie() {
    const rows = await db.query(`SELECT setting_value FROM system_setting WHERE setting_key = 'xhs_cookie' LIMIT 1`)
    return rows[0]?.setting_value || ''
  }

  /** 存小红书 cookie */
  static async setCookie(cookie) {
    await db.query(
      `INSERT INTO system_setting (setting_key, setting_value, setting_desc, create_time, update_time)
       VALUES ('xhs_cookie', ?, '小红书登录 cookie（关键词采集用）', NOW(), NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), update_time = NOW()`,
      [cookie]
    )
  }

  /**
   * 起子进程搜索。返回 { items, skippedVideo, skippedAd }。失败抛错。
   * cwd 设为 backend 根目录，让 .xhs-auth.json 落在固定位置。
   */
  static runSearchProcess(keywords, limit, cookie = '') {
    return new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [SEARCH_SCRIPT],
        {
          cwd: path.join(__dirname, '../..'),
          maxBuffer: 50 * 1024 * 1024,
          timeout: 600000,
          windowsHide: true,
          // 中文关键词经命令行参数在 Windows 会 GBK 乱码，改用环境变量传（UTF-8 安全）
          env: { ...process.env, XHS_KEYWORDS: keywords.join(','), XHS_COOKIE: cookie, XHS_LIMIT: String(limit) }
        },
        (err, stdout) => {
          if (err) return reject(err)
          try { resolve(JSON.parse(stdout)) }
          catch (e) { reject(new Error('搜索脚本输出解析失败: ' + e.message)) }
        }
      )
    })
  }

  /**
   * 发起采集：建批次 → 后台异步跑 → 立即返回 runId。
   * @returns {Promise<{runId:number}>}
   */
  static async startCrawl({ keywords, limit = 60, userId = null }) {
    const kws = (Array.isArray(keywords) ? keywords : String(keywords).split(/[,，\s]+/)).map(s => s.trim()).filter(Boolean)
    if (!kws.length) throw new Error('请提供至少一个关键词')

    const result = await db.query(
      `INSERT INTO crawl_run (keywords, status, created_by, created_at) VALUES (?, 'running', ?, NOW())`,
      [kws.join(','), userId]
    )
    const runId = result.insertId
    runningRuns.add(runId)

    // 后台执行，不阻塞响应
    XhsCrawlerService._execute(runId, kws, limit).catch(async (e) => {
      console.error(`[xhs-crawl] 批次 ${runId} 失败:`, e.message)
      await db.query(`UPDATE crawl_run SET status = 'failed', error = ?, finished_at = NOW() WHERE id = ?`, [String(e.message).slice(0, 500), runId])
    }).finally(() => runningRuns.delete(runId))

    return { runId }
  }

  static async _execute(runId, keywords, limit) {
    const cookie = await XhsCrawlerService.getCookie()
    const { items = [], skippedVideo = 0, skippedAd = 0 } = await XhsCrawlerService.runSearchProcess(keywords, limit, cookie)
    console.log(`[xhs-crawl] 批次 ${runId} 召回 ${items.length} 帖（跳过视频${skippedVideo}/广告${skippedAd}）`)

    let newCount = 0
    for (const it of items) {
      try {
        if (!it.sourceUrl) continue
        // 去重：vs 历史候选（硬跳过）
        const dupCand = await db.query('SELECT id FROM inspiration_candidate WHERE source_url = ? LIMIT 1', [it.sourceUrl])
        if (dupCand.length) continue

        // vs 已有灵感（软提示）
        let dedupId = null
        const existed = await db.query('SELECT id FROM inspiration WHERE source_url = ? AND is_delete = 0 LIMIT 1', [it.sourceUrl])
        if (existed.length) dedupId = existed[0].id

        // 下载封面（第一张图）到本地
        let coverImage = null
        if (it.images?.length) {
          try { coverImage = await downloadImage(it.images[0], 'cover') } catch { coverImage = null }
        }
        const images = it.images?.length ? it.images.join(',') : null

        const insRes = await db.query(
          `INSERT INTO inspiration_candidate
            (crawl_run_id, keyword, source_platform, source_url, title, author,
             cover_image, images, post_tags, dedup_inspiration_id, status, created_at)
           VALUES (?, ?, '小红书', ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            runId,
            keywords.join(','),
            it.sourceUrl,
            it.title || null,
            it.author || null,
            coverImage,
            images,
            it.xhsTags?.length ? it.xhsTags.join(',') : null,
            dedupId
          ]
        )
        newCount++

        // AI 预筛打分（降级：失败/无key不阻断，候选仍待人工复核）
        try {
          const s = await AiAnalyzer.scoreCandidate({ title: it.title, description: '', post_tags: it.xhsTags?.join(',') })
          if (s) {
            await db.query(
              `UPDATE inspiration_candidate SET ai_score = ?, ai_reason = ?, ai_category = ? WHERE id = ?`,
              [s.score, s.reason, s.category, insRes.insertId]
            )
          }
        } catch { /* 打分失败不影响入库 */ }
      } catch (e) {
        // 单帖失败（如唯一键并发冲突）不影响整批
        if (!/Duplicate entry/i.test(e.message)) console.error(`[xhs-crawl] 批次 ${runId} 单帖入库失败:`, e.message)
      }
    }

    await db.query(
      `UPDATE crawl_run SET status = 'ok', recalled = ?, new_count = ?, finished_at = NOW() WHERE id = ?`,
      [items.length, newCount, runId]
    )
    console.log(`[xhs-crawl] 批次 ${runId} 完成：新增候选 ${newCount} 条`)
  }

  /** 批次状态 */
  static async getRun(runId) {
    const rows = await db.query('SELECT * FROM crawl_run WHERE id = ?', [runId])
    return rows[0] || null
  }

  /** 最近批次列表 */
  static async listRuns(limit = 20) {
    return db.query('SELECT * FROM crawl_run ORDER BY id DESC LIMIT ?', [limit])
  }

  /**
   * 扫码登录：起非无头子进程，用户扫码，成功后存 cookie。阻塞直到完成/超时（最长约130秒）。
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  static runLoginProcess() {
    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [LOGIN_SCRIPT],
        { cwd: path.join(__dirname, '../..'), maxBuffer: 10 * 1024 * 1024, timeout: 180000, windowsHide: false },
        async (err, stdout) => {
          if (err) return resolve({ success: false, error: err.message })
          try {
            const out = JSON.parse(stdout)
            if (out.success && out.cookie) await XhsCrawlerService.setCookie(out.cookie)
            resolve(out)
          } catch (e) { resolve({ success: false, error: '登录脚本输出解析失败' }) }
        }
      )
    })
  }
}

module.exports = XhsCrawlerService
