/**
 * 外部灵感 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const MetaFetcher = require('../services/MetaFetcher')
const AiAnalyzer = require('../services/AiAnalyzer')
const { downloadImage } = require('../utils/imageDownload')
const { validate } = require('../utils/validator')
const { isSensitiveSource } = require('../utils/urlSafety')
const LinkChecker = require('../services/LinkChecker')
const { loadTagsByType, matchTagIds } = require('../utils/tagMatcher')

class InspirationController {
  /**
   * 从链接自动抓取元数据，只补全 data 中为空的字段（已有内容不覆盖，保留快照）
   * @param {object} data 表单数据（会被原地修改）
   * @param {string} url 待抓取的链接
   */
  static async autofillFromUrl(data, url) {
    if (!url || !url.startsWith('http')) return
    let meta
    try { meta = await MetaFetcher.fetch(url) } catch { return } // 抓取失败静默跳过，保留用户手填内容
    if (!meta) return
    // 敏感来源(github/gitee 等代码仓库)：不抓取封面/图片，避免仓库预览图与地址暴露到灵感库卡片
    const sensitive = isSensitiveSource(url)
    if (!data.title && meta.title) data.title = meta.title.substring(0, 200)
    if (!data.source_name && (meta.site_name || meta.author)) data.source_name = meta.author || meta.site_name
    if (!data.source_platform && meta.platform) data.source_platform = meta.platform
    if (!data.source_type && meta.platform) data.source_type = meta.platform
    if (!data.author && meta.author) data.author = meta.author
    // 内容快照(description)= 帖子/视频正文简介，完整存储（description 为 text 类型，不截断）；价值说明(reference_value)由用户填写，不自动填充；AI总结(content_summary)由分析接口生成
    if (!data.description && meta.description) data.description = meta.description
    // 保存帖子原始标签(话题tag)，用于后续直接匹配IP/品类/工艺/场景
    if (!data.post_tags && meta.tags?.length) data.post_tags = meta.tags.join(',')
    if (!data.cover_image && meta.image && !sensitive) {
      // 封面下载到本地，避免 CDN 链接过期/防盗链导致卡片封面无法显示
      const localFile = await downloadImage(meta.image, 'cover')
      data.cover_image = localFile || null  // 下载失败不存远程链接（浏览器加载不了）
    }
    if (!data.images && meta.allImages?.length && !sensitive) data.images = meta.allImages.join(',')
    // 互动数据(点赞/收藏/评论/播放)
    if (meta.likeCount) data.like_count = meta.likeCount
    if (meta.saveCount) data.save_count = meta.saveCount
    if (meta.commentCount) data.comment_count = meta.commentCount
    if (meta.playCount) data.play_count = meta.playCount
    // 用抓到的话题标签直接匹配库内 IP/品类/工艺/场景标签，新建即自动填（仅当用户未手填）
    if (meta.tags?.length) {
      try {
        const tagsByType = await loadTagsByType(db)
        const matched = matchTagIds(meta.tags, tagsByType)
        if (!data.ip_tag_ids && matched.ip.length) data.ip_tag_ids = matched.ip.join(',')
        if (!data.category_tag_ids && matched.category.length) data.category_tag_ids = matched.category.join(',')
        if (!data.craft_tag_ids && matched.craft.length) data.craft_tag_ids = matched.craft.join(',')
        if (!data.scene_tag_ids && matched.scene.length) data.scene_tag_ids = matched.scene.join(',')
      } catch { /* 标签匹配失败不影响主流程 */ }
    }
  }

  /**
   * 灵感列表（筛选、搜索）
   * GET /api/inspirations
   */
  async list(req, res, next) {
    try {
      const {
        page = 1, pageSize = 10, keyword, inspiration_type, source_type,
        collection_status, folder_id, is_featured, is_pinned, link_status,
        tag_type, tag_ids, category_tag_ids, craft_tag_ids, ip_tag_ids, scene_tag_ids,
        start_date, end_date,
        sort_field = 'create_time', sort_order = 'DESC'
      } = req.query

      const offset = (page - 1) * pageSize
      let whereClause = 'WHERE i.is_delete = 0'
      const params = []

      // 关键词搜索
      if (keyword) {
        whereClause += ` AND (i.title LIKE ? OR i.description LIKE ? OR i.author LIKE ?)`
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      // 灵感类型筛选（支持多分类：categories 字段用 FIND_IN_SET 匹配，兼容旧 inspiration_type）
      if (inspiration_type) {
        whereClause += ' AND (FIND_IN_SET(?, COALESCE(i.categories, i.inspiration_type)) > 0)'
        params.push(inspiration_type)
      }

      // 来源类型筛选（同时匹配 source_type 和 source_platform）
      if (source_type) {
        whereClause += ' AND (i.source_type = ? OR i.source_platform = ?)'
        params.push(source_type, source_type)
      }

      // 收藏状态筛选
      if (collection_status) {
        whereClause += ' AND i.collection_status = ?'
        params.push(collection_status)
      }

      // 收藏夹筛选
      if (folder_id) {
        whereClause += ' AND i.folder_id = ?'
        params.push(folder_id)
      }

      // 链接状态筛选（unknown/ok/dead/error）
      if (link_status) {
        whereClause += ' AND i.link_status = ?'
        params.push(link_status)
      }

      // 精选筛选
      if (is_featured !== undefined) {
        whereClause += ' AND i.is_featured = ?'
        params.push(is_featured)
      }

      // 置顶筛选
      if (is_pinned !== undefined) {
        whereClause += ' AND i.is_pinned = ?'
        params.push(is_pinned)
      }

      // 标签筛选（tag_type 拼入列名，必须用白名单校验，防止 SQL 注入）
      if (tag_type && tag_ids) {
        const allowedTagTypes = ['ip', 'category', 'craft', 'scene']
        if (allowedTagTypes.includes(tag_type)) {
          whereClause += ` AND i.${tag_type}_tag_ids LIKE ?`
          params.push(`%${tag_ids}%`)
        }
      }

      // 直接按各类标签 ID 筛选（前端品类/工艺等下拉），列名为固定常量，安全
      if (category_tag_ids) {
        whereClause += ' AND i.category_tag_ids LIKE ?'
        params.push(`%${category_tag_ids}%`)
      }
      if (craft_tag_ids) {
        whereClause += ' AND i.craft_tag_ids LIKE ?'
        params.push(`%${craft_tag_ids}%`)
      }
      if (ip_tag_ids) {
        whereClause += ' AND i.ip_tag_ids LIKE ?'
        params.push(`%${ip_tag_ids}%`)
      }
      if (scene_tag_ids) {
        whereClause += ' AND i.scene_tag_ids LIKE ?'
        params.push(`%${scene_tag_ids}%`)
      }

      // 日期范围
      if (start_date) {
        whereClause += ' AND i.create_time >= ?'
        params.push(start_date)
      }
      if (end_date) {
        whereClause += ' AND i.create_time <= ?'
        params.push(end_date)
      }

      // 排序
      const validSortFields = ['create_time', 'update_time', 'like_count', 'view_count', 'save_count', 'play_count', 'comment_count']
      const sortField = validSortFields.includes(sort_field) ? sort_field : 'create_time'
      const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // 置顶优先
      const orderClause = `ORDER BY i.is_pinned DESC, i.${sortField} ${sortOrder}`

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM inspiration i ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      // 查询列表
      const listSql = `
        SELECT i.*, 
               f.folder_name,
               u.nickname as creator_name
        FROM inspiration i
        LEFT JOIN inspiration_folder f ON i.folder_id = f.id
        LEFT JOIN sys_user u ON i.create_user_id = u.id
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `
      const list = await db.query(listSql, [...params, parseInt(pageSize), parseInt(offset)])

      res.json(Response.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 灵感详情
   * GET /api/inspirations/:id
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params

      const sql = `
        SELECT i.*,
               f.folder_name,
               u.nickname as creator_name
        FROM inspiration i
        LEFT JOIN inspiration_folder f ON i.folder_id = f.id
        LEFT JOIN sys_user u ON i.create_user_id = u.id
        WHERE i.id = ? AND i.is_delete = 0
      `
      const [inspiration] = await db.query(sql, [id])

      if (!inspiration) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }

      // 更新浏览数
      await db.query('UPDATE inspiration SET view_count = view_count + 1 WHERE id = ?', [id])
      inspiration.view_count++

      res.json(Response.success(inspiration))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增灵感
   * POST /api/inspirations
   */
  async create(req, res, next) {
    try {
      // title 非必填：有 source_url 时由 autofill 自动抓取标题
      const v = validate(req.body)
        .required(['source_url'])
        .maxLength('title', 200)
        .maxLength('source_url', 1000)
        .isIn('source_type', ['pinterest', 'instagram', '小红书', '微博', '抖音', '淘宝', '1688', '站酷', '电商平台', 'other'])
        .isIn('collection_status', ['uncollected', 'collected', 'applied'])

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const {
        title,
        inspiration_type = 'peripheral',
        categories,
        source_type,
        source_name,
        source_url,
        author,
        author_url,
        ip_tag_ids,
        category_tag_ids,
        craft_tag_ids,
        scene_tag_ids,
        description,
        reference_value,
        content_summary,
        notes,
        application_scenario,
        cover_image,
        images,
        video_url,
        thumbnail,
        collect_time,
        is_adopted = 0,
        collection_status = 'uncollected',
        folder_id,
        is_featured = 0,
        is_pinned = 0,
        related_project_ids
      } = req.body

      // 首次录入：自动从链接抓取元数据，补全空字段（链接失效后这些快照仍保留）
      const snap = {
        title: title || null,
        author: author || null,
        source_name: source_name || null,
        source_platform: null,
        source_type: source_type || null,
        description: description || null,
        reference_value: reference_value || null,
        post_tags: null,
        like_count: 0,
        save_count: 0,
        content_summary: content_summary || null,
        cover_image: cover_image || null,
        images: images || null
      }
      await InspirationController.autofillFromUrl(snap, source_url)
      // 兜底：autofill 没抓到标题时给默认值（DB title 非空）
      if (!snap.title) snap.title = '未命名灵感'

      const sql = `
        INSERT INTO inspiration (
          title, inspiration_type, categories, source_type, source_platform, source_name, source_url, link, author, author_url,
          ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
          description, reference_value, post_tags, content_summary, notes, application_scenario,
          cover_image, images, video_url, thumbnail,
          collect_time, is_adopted, collection_status, folder_id, is_featured, is_pinned,
          related_project_ids, create_user_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        snap.title, inspiration_type, categories || null, snap.source_type, snap.source_platform, snap.source_name, source_url, source_url, snap.author, author_url,
        ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        snap.description, snap.reference_value, snap.post_tags, snap.content_summary, notes, application_scenario,
        snap.cover_image, snap.images, video_url, thumbnail,
        collect_time || new Date(), is_adopted, collection_status, folder_id, is_featured, is_pinned,
        related_project_ids, req.user?.id
      ])

      // 后台自动触发 AI 图文分析（不阻塞创建请求，约1分钟完成，完成后图文自动入库）
      const newId = result.insertId
      InspirationController._analyzeInspiration(newId).catch(e => {
        console.error(`[inspiration ${newId}] 后台自动分析失败:`, e.message)
      })

      res.json(Response.success({ id: newId }, '创建成功，正在后台自动分析图文，约1分钟后刷新查看'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑灵感
   * PUT /api/inspirations/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      let {
        title,
        source_type,
        source_name,
        source_url,
        author,
        author_url,
        ip_tag_ids,
        category_tag_ids,
        craft_tag_ids,
        scene_tag_ids,
        description,
        content_summary,
        notes,
        application_scenario,
        cover_image,
        images,
        video_url,
        thumbnail,
        collection_status,
        folder_id,
        is_featured,
        is_pinned,
        application_result,
        application_date,
        is_sensitive,
        sensitive_reason
      } = req.body

      // 编辑时若提供了新链接且快照字段为空，自动抓取补全（已有内容不覆盖）
      if (source_url) {
        const snap = {
          title: title || null,
          author: author || null,
          source_name: source_name || null,
          source_platform: null,
          source_type: source_type || null,
          description: description || null,
          reference_value: null,
          content_summary: content_summary || null,
          cover_image: cover_image || null,
          images: images || null
        }
        await InspirationController.autofillFromUrl(snap, source_url)
        // 把补全后的值回填到局部变量（COALESCE 会保留数据库已有非空值，这里只补原本为空的）
        if (snap.title) title = snap.title
        if (snap.author) author = snap.author
        if (snap.source_name) source_name = snap.source_name
        if (snap.source_type) source_type = snap.source_type
        if (snap.description) description = snap.description
        if (snap.content_summary) content_summary = snap.content_summary
        if (snap.cover_image) cover_image = snap.cover_image
        if (snap.images) images = snap.images
      }

      const sql = `
        UPDATE inspiration SET
          title = COALESCE(?, title),
          source_type = COALESCE(?, source_type),
          source_name = COALESCE(?, source_name),
          source_url = COALESCE(?, source_url),
          author = COALESCE(?, author),
          author_url = COALESCE(?, author_url),
          ip_tag_ids = COALESCE(?, ip_tag_ids),
          category_tag_ids = COALESCE(?, category_tag_ids),
          craft_tag_ids = COALESCE(?, craft_tag_ids),
          scene_tag_ids = COALESCE(?, scene_tag_ids),
          description = COALESCE(?, description),
          content_summary = COALESCE(?, content_summary),
          notes = COALESCE(?, notes),
          application_scenario = COALESCE(?, application_scenario),
          cover_image = COALESCE(?, cover_image),
          images = COALESCE(?, images),
          video_url = COALESCE(?, video_url),
          thumbnail = COALESCE(?, thumbnail),
          collection_status = COALESCE(?, collection_status),
          folder_id = COALESCE(?, folder_id),
          is_featured = COALESCE(?, is_featured),
          is_pinned = COALESCE(?, is_pinned),
          application_result = COALESCE(?, application_result),
          application_date = COALESCE(?, application_date),
          is_sensitive = COALESCE(?, is_sensitive),
          sensitive_reason = COALESCE(?, sensitive_reason),
          update_time = NOW()
        WHERE id = ? AND is_delete = 0
      `

      const result = await db.query(sql, [
        title, source_type, source_name, source_url, author, author_url,
        ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        description, content_summary, notes, application_scenario,
        cover_image, images, video_url, thumbnail,
        collection_status, folder_id, is_featured, is_pinned,
        application_result, application_date, is_sensitive, sensitive_reason,
        id
      ])

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除灵感（管理员专属）
   * DELETE /api/inspirations/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      // 权限检查：仅管理员可删除
      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      const result = await db.query(
        'UPDATE inspiration SET is_delete = 1, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 检测单条灵感的链接是否失效
   * POST /api/inspirations/:id/check-link
   */
  async checkLink(req, res, next) {
    try {
      const { id } = req.params
      const [row] = await db.query(
        'SELECT id, source_url, link FROM inspiration WHERE id = ? AND is_delete = 0',
        [id]
      )
      if (!row) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }
      const url = row.source_url || row.link
      const r = await LinkChecker.check(url)
      await db.query(
        'UPDATE inspiration SET link_status = ?, link_http_code = ?, link_checked_at = NOW() WHERE id = ?',
        [r.status, r.httpCode, id]
      )
      res.json(Response.success(r, '检测完成'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量检测链接失效（默认检测全部未删除灵感，可按 inspiration_type 限定）
   * POST /api/inspirations/check-links
   */
  async checkLinksBatch(req, res, next) {
    try {
      const { inspiration_type } = req.body || {}
      let sql = 'SELECT id, source_url, link FROM inspiration WHERE is_delete = 0'
      const params = []
      if (inspiration_type) {
        sql += ' AND inspiration_type = ?'
        params.push(inspiration_type)
      }
      const rows = await db.query(sql, params)
      const items = rows
        .map(r => ({ id: r.id, url: r.source_url || r.link }))
        .filter(it => it.url)

      const summary = await LinkChecker.checkBatch(items, async (id, r) => {
        await db.query(
          'UPDATE inspiration SET link_status = ?, link_http_code = ?, link_checked_at = NOW() WHERE id = ?',
          [r.status, r.httpCode, id]
        )
      })
      // 没有链接可检测的条目记为跳过
      summary.skipped = rows.length - items.length
      res.json(Response.success(summary, `检测完成：失效 ${summary.dead}，无法验证 ${summary.error}，正常 ${summary.ok}`))
    } catch (error) {
      next(error)
    }
  }

  /**
   * AI 分析帖子图片内容
   * POST /api/inspirations/:id/analyze
   * 读取帖子所有图片 + 正文，OCR 每张图 + 文本模型总结，
   * 同时把图片下载到本地永久保存，每图OCR文字存入 image_texts
   */
  async analyzeImages(req, res, next) {
    try {
      const { id } = req.params
      const r = await InspirationController._analyzeInspiration(id)
      if (r.error) return res.status(400).json(Response.badRequest(r.error))
      res.json(Response.success({ ocrCount: r.ocrCount, downloaded: r.downloaded, summary: r.summary }, 'AI分析完成'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 分析灵感图文的核心逻辑（可被 analyzeImages 接口和 create 后台调用）
   * @returns {Promise<{ocrCount, downloaded, summary, error?}>}
   */
  static async _analyzeInspiration(id) {
    const [insp] = await db.query('SELECT id, link, source_url, images, description, image_texts, cover_image FROM inspiration WHERE id = ? AND is_delete = 0', [id])
    if (!insp) return { error: '灵感不存在' }

    let imageUrls = []
    const url = insp.link || insp.source_url
    const sensitive = isSensitiveSource(url)
    if (url) {
      try {
        const meta = await MetaFetcher.fetch(url)
        // 敏感来源(github/gitee)：不取其图片/封面，避免仓库预览图入库
        imageUrls = sensitive ? [] : (meta.allImages || [])
        if (imageUrls.length && meta.image && !sensitive) {
          // 封面下载到本地（不存远程链接，避免防盗链/过期导致加载失败）
          const localCover = insp.cover_image && !String(insp.cover_image).startsWith('http') ? insp.cover_image : (await downloadImage(meta.image, 'cover'))
          if (localCover) {
            await db.query('UPDATE inspiration SET cover_image = ? WHERE id = ?', [localCover, id])
          }
        }
      } catch (e) { /* 链接已失效则用已存图片兜底 */ }
    }
    if (imageUrls.length === 0 && insp.images && String(insp.images).includes('http')) {
      imageUrls = String(insp.images).split(',').map(s => s.trim()).filter(Boolean)
    }

    let existingLocal = []
    if (insp.image_texts) {
      try {
        const arr = JSON.parse(insp.image_texts)
        existingLocal = (Array.isArray(arr) ? arr : []).filter(r => r.file)
      } catch {}
    }

    let imageTexts = []
    if (imageUrls.length) {
      const r = await AiAnalyzer.analyzePost(imageUrls, insp.description || '')
      imageTexts = r.imageTexts
    }
    if (imageTexts.length === 0 && existingLocal.length) {
      for (const local of existingLocal) {
        imageTexts.push({ index: imageTexts.length + 1, url: '', file: local.file, text: local.text || '' })
      }
    }
    if (imageTexts.length === 0) {
      return { error: '该灵感没有可分析的图片。若是1688/淘宝等登录墙平台，请先在详情里上传截图，再点AI分析' }
    }

    for (const r of imageTexts) {
      if (!r.text && r.file && !r.url) {
        try { r.text = await AiAnalyzer.ocrLocalFile(r.file) } catch { r.text = '' }
      }
    }

    await AiAnalyzer.cleanOcrTexts(imageTexts)
    const ocrText = imageTexts.filter(Boolean).map(r => `【图${r.index}】\n${r.text || '(无文字)'}`).join('\n\n')
    let summary = ''
    try { summary = await AiAnalyzer.summarize(ocrText, insp.description || '') }
    catch { summary = '总结生成失败，以下为各图识别文字：\n\n' + ocrText }

    const localFiles = imageTexts.filter(r => r.file).map(r => r.file)
    const imageTextsJson = JSON.stringify(imageTexts.map(r => ({ file: r.file, url: r.url, text: r.text })))

    // 提取价值说明 + 自动匹配标签（IP/品类/工艺/场景）
    let referenceValue = '', tagUpdates = {}
    try {
      const tagsByType = await loadTagsByType(db)

      // 1. 先用帖子原始标签直接匹配（最准确）
      const postTags = insp.post_tags ? insp.post_tags.split(',').map(s => s.trim()).filter(Boolean) : []
      const directMatched = matchTagIds(postTags, tagsByType)

      // 2. AI 提取补充（对直接匹配没覆盖的标签）
      const contentWithTags = (insp.description || '') + '\n' + ocrText + (postTags.length ? '\n帖子标签: ' + postTags.join('、') : '')
      const meta = await AiAnalyzer.extractMeta(contentWithTags, tagsByType)

      // 3. 合并：直接匹配优先，AI 补充
      for (const type of ['ip', 'category', 'craft', 'scene']) {
        const combined = new Set([...(directMatched[type] || []), ...(meta.tagIds[type] || [])])
        tagUpdates[type] = [...combined]
      }
      referenceValue = meta.reference_value
    } catch (e) { /* 标签提取失败不影响主流程 */ }

    // AI 多分类（可属于多个分类），失败时兜底用已有 inspiration_type
    let categoriesStr = ''
    try {
      const cats = await AiAnalyzer.categorize((insp.description || '') + '\n' + ocrText + '\n' + (summary || ''))
      if (cats.length) categoriesStr = cats.join(',')
    } catch (e) { /* 分类失败不影响主流程 */ }
    // 兜底：AI 分类失败时用已有 inspiration_type，确保至少有一个分类
    if (!categoriesStr && insp.inspiration_type) {
      categoriesStr = insp.inspiration_type
    }

    await db.query(
      `UPDATE inspiration SET content_summary = ?, image_texts = ?, images = COALESCE(?, images),
       reference_value = COALESCE(NULLIF(?, ''), reference_value),
       ip_tag_ids = COALESCE(NULLIF(?, ''), ip_tag_ids),
       category_tag_ids = COALESCE(NULLIF(?, ''), category_tag_ids),
       craft_tag_ids = COALESCE(NULLIF(?, ''), craft_tag_ids),
       scene_tag_ids = COALESCE(NULLIF(?, ''), scene_tag_ids),
       categories = COALESCE(NULLIF(?, ''), categories),
       update_time = NOW() WHERE id = ?`,
      [
        summary, imageTextsJson, localFiles.length ? localFiles.join(',') : null,
        referenceValue,
        (tagUpdates.ip || []).join(',') || null,
        (tagUpdates.category || []).join(',') || null,
        (tagUpdates.craft || []).join(',') || null,
        (tagUpdates.scene || []).join(',') || null,
        categoriesStr || null,
        id
      ]
    )
    return { ocrCount: imageTexts.length, downloaded: imageTexts.filter(r => r.file && r.url).length, summary }
  }

  /**
   * 编辑灵感详情（就地修改图文）
   * PUT /api/inspirations/:id/detail
   * body: { title?, author?, description?, content_summary?, image_texts? }
   *   image_texts 为 [{file, text}] 数组（编辑后的逐图文字+本地文件名）
   */
  async updateDetail(req, res, next) {
    try {
      const { id } = req.params
      const { title, author, description, content_summary, image_texts, categories } = req.body

      const updates = []
      const params = []
      if (title !== undefined) { updates.push('title = ?'); params.push(title) }
      if (author !== undefined) { updates.push('author = ?'); params.push(author) }
      if (description !== undefined) { updates.push('description = ?'); params.push(description) }
      if (content_summary !== undefined) { updates.push('content_summary = ?'); params.push(content_summary) }
      if (categories !== undefined) {
        updates.push('categories = ?'); params.push(categories || null)
        // 同步 inspiration_type 为第一个分类
        const first = categories ? String(categories).split(',')[0].trim() : null
        if (first) { updates.push('inspiration_type = ?'); params.push(first) }
      }
      if (image_texts !== undefined) {
        // image_texts 可能为 null（清空）或数组
        const arr = Array.isArray(image_texts) ? image_texts : []
        const json = arr.length ? JSON.stringify(arr.map(r => ({ file: r.file || null, text: r.text || '' }))) : null
        const files = arr.filter(r => r.file).map(r => r.file)
        updates.push('image_texts = ?'); params.push(json)
        updates.push('images = ?'); params.push(files.length ? files.join(',') : null)
        // 封面取第一张本地图
        updates.push('cover_image = COALESCE(?, cover_image)'); params.push(files[0] || null)
      }
      if (updates.length === 0) {
        return res.json(Response.success(null, '无更新内容'))
      }
      updates.push('update_time = NOW()')
      params.push(id)
      await db.query(`UPDATE inspiration SET ${updates.join(', ')} WHERE id = ? AND is_delete = 0`, params)
      res.json(Response.success(null, '保存成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 重新抓取内容快照（从链接重新拉取完整正文，覆盖被字数限制截断的 description）
   * POST /api/inspirations/:id/refresh-snapshot
   * 覆盖 description；title/author/cover 为空则补全，非空保留
   */
  async refreshSnapshot(req, res, next) {
    try {
      const { id } = req.params
      const [insp] = await db.query('SELECT id, link, source_url, description, title, author, cover_image FROM inspiration WHERE id = ? AND is_delete = 0', [id])
      if (!insp) return res.status(404).json(Response.notFound('灵感不存在'))

      const url = insp.link || insp.source_url
      if (!url) return res.status(400).json(Response.badRequest('该灵感没有链接，无法重新抓取'))

      let meta
      try { meta = await MetaFetcher.fetch(url) }
      catch (e) { return res.status(400).json(Response.badRequest('链接抓取失败（可能已失效）：' + e.message)) }

      const updates = []
      const params = []
      // description 强制覆盖为完整正文（解决之前字数截断）
      if (meta.description) { updates.push('description = ?'); params.push(meta.description.substring(0, 2000)) }
      // 其余字段仅补空
      if (!insp.title && meta.title) { updates.push('title = ?'); params.push(meta.title.substring(0, 200)) }
      if (!insp.author && meta.author) { updates.push('author = ?'); params.push(meta.author) }
      if (!insp.cover_image && meta.image) {
        const localFile = await downloadImage(meta.image, 'cover')
        if (localFile) { updates.push('cover_image = ?'); params.push(localFile) }
      }
      if (updates.length === 0) {
        return res.json(Response.success(null, '未抓取到可更新的内容'))
      }
      updates.push('update_time = NOW()')
      params.push(id)
      await db.query(`UPDATE inspiration SET ${updates.join(', ')} WHERE id = ?`, params)
      res.json(Response.success({ descLength: meta.description ? meta.description.length : 0 }, '内容快照已重新生成'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 手动设置链接状态（覆盖自动检测结果）
   * PUT /api/inspirations/:id/link-status
   * body: { status: 'ok'|'dead'|'error'|'unknown' }
   */
  async setLinkStatus(req, res, next) {
    try {
      const { id } = req.params
      const { status } = req.body
      const valid = ['ok', 'dead', 'error', 'unknown']
      if (!valid.includes(status)) {
        return res.status(400).json(Response.badRequest('无效的状态值'))
      }
      await db.query(
        'UPDATE inspiration SET link_status = ?, link_checked_at = NOW(), update_time = NOW() WHERE id = ? AND is_delete = 0',
        [status, id]
      )
      res.json(Response.success(null, '链接状态已更新'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新灵感链接（source_url + link 同步更新）
   * PUT /api/inspirations/:id/link
   * body: { link: '新链接URL' }
   */
  async updateLink(req, res, next) {
    try {
      const { id } = req.params
      const { link } = req.body
      if (!link || !link.startsWith('http')) {
        return res.status(400).json(Response.badRequest('请提供有效的链接URL'))
      }
      await db.query(
        'UPDATE inspiration SET source_url = ?, link = ?, link_status = ?, link_checked_at = NOW(), update_time = NOW() WHERE id = ? AND is_delete = 0',
        [link, link, 'unknown', id]
      )
      res.json(Response.success(null, '链接已更新，状态重置为未检测'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new InspirationController()
