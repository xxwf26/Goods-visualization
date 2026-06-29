/**
 * 外部灵感 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const MetaFetcher = require('../services/MetaFetcher')
const AiAnalyzer = require('../services/AiAnalyzer')
const { downloadImage } = require('../utils/imageDownload')
const { validate } = require('../utils/validator')
const LinkChecker = require('../services/LinkChecker')

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
    if (!data.title && meta.title) data.title = meta.title.substring(0, 200)
    if (!data.source_name && (meta.site_name || meta.author)) data.source_name = meta.author || meta.site_name
    if (!data.source_platform && meta.platform) data.source_platform = meta.platform
    if (!data.source_type && meta.platform) data.source_type = meta.platform
    if (!data.author && meta.author) data.author = meta.author
    // 内容快照(description)= 帖子正文引言，单独存储(2000字)；价值说明(reference_value)由用户填写，不自动填充；AI总结(content_summary)由分析接口生成
    if (!data.description && meta.description) data.description = meta.description.substring(0, 2000)
    if (!data.cover_image && meta.image) {
      // 封面下载到本地，避免 CDN 链接过期后卡片封面丢失
      const localFile = await downloadImage(meta.image, 'cover')
      data.cover_image = localFile || meta.image
    }
    if (!data.images && meta.allImages?.length) data.images = meta.allImages.join(',')
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

      // 灵感类型筛选
      if (inspiration_type) {
        whereClause += ' AND i.inspiration_type = ?'
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
      const validSortFields = ['create_time', 'update_time', 'like_count', 'view_count', 'save_count']
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
      const v = validate(req.body)
        .required(['title', 'source_url'])
        .maxLength('title', 200)
        .maxLength('source_url', 1000)
        .isIn('source_type', ['pinterest', 'instagram', '小红书', '微博', '抖音', '淘宝', '1688', '站酷', '电商平台', 'other'])
        .isIn('collection_status', ['uncollected', 'collected', 'applied'])

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const {
        title,
        inspiration_type = 'product',
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
        content_summary: content_summary || null,
        cover_image: cover_image || null,
        images: images || null
      }
      await InspirationController.autofillFromUrl(snap, source_url)

      const sql = `
        INSERT INTO inspiration (
          title, inspiration_type, source_type, source_platform, source_name, source_url, link, author, author_url,
          ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
          description, reference_value, content_summary, notes, application_scenario,
          cover_image, images, video_url, thumbnail,
          collect_time, is_adopted, collection_status, folder_id, is_featured, is_pinned,
          related_project_ids, create_user_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        snap.title, inspiration_type, snap.source_type, snap.source_platform, snap.source_name, source_url, source_url, snap.author, author_url,
        ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        snap.description, snap.reference_value, snap.content_summary, notes, application_scenario,
        snap.cover_image, snap.images, video_url, thumbnail,
        collect_time || null, is_adopted, collection_status, folder_id, is_featured, is_pinned,
        related_project_ids, req.user?.id
      ])

      res.json(Response.success({ id: result.insertId }, '创建成功'))
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
   * 收藏灵感
   * POST /api/inspirations/:id/collect
   */
  async collect(req, res, next) {
    try {
      const { id } = req.params
      const { folder_id } = req.body

      const result = await db.query(
        'UPDATE inspiration SET collection_status = "collected", folder_id = ?, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [folder_id, id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }

      res.json(Response.success(null, '收藏成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 取消收藏
   * POST /api/inspirations/:id/uncollect
   */
  async uncollect(req, res, next) {
    try {
      const { id } = req.params

      const result = await db.query(
        'UPDATE inspiration SET collection_status = "uncollected", folder_id = NULL, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('灵感不存在'))
      }

      res.json(Response.success(null, '已取消收藏'))
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
   * 收藏夹列表
   * GET /api/inspiration-folders
   */
  async folders(req, res, next) {
    try {
      const sql = `
        SELECT f.*,
               COUNT(i.id) as inspiration_count
        FROM inspiration_folder f
        LEFT JOIN inspiration i ON f.id = i.folder_id AND i.is_delete = 0
        WHERE f.is_delete = 0
        GROUP BY f.id
        ORDER BY f.sort ASC, f.id ASC
      `
      const list = await db.query(sql)

      res.json(Response.success(list))
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
      const [insp] = await db.query('SELECT id, link, source_url, images, description FROM inspiration WHERE id = ? AND is_delete = 0', [id])
      if (!insp) return res.status(404).json(Response.notFound('灵感不存在'))

      let imageUrls = []
      // 已存的 images 若是本地文件(不含http)则直接用本地图；否则视为远程URL需重新抓取
      if (insp.images && !String(insp.images).includes('http')) {
        // 已下载过本地图，但仍需远程URL做OCR(本地文件AI读不了)，所以重新抓远程URL
      }
      const url = insp.link || insp.source_url
      if (url) {
        try {
          const meta = await MetaFetcher.fetch(url)
          imageUrls = meta.allImages || []
          if (imageUrls.length) {
            await db.query('UPDATE inspiration SET cover_image = COALESCE(cover_image, ?) WHERE id = ?', [meta.image, id])
          }
        } catch (e) { /* 链接已失效则用已存图片兜底 */ }
      }
      // 链接抓不到时，用已存的远程URL兜底
      if (imageUrls.length === 0 && insp.images && String(insp.images).includes('http')) {
        imageUrls = String(insp.images).split(',').map(s => s.trim()).filter(Boolean)
      }

      if (imageUrls.length === 0) {
        return res.status(400).json(Response.badRequest('该灵感没有可分析的图片，请先确保链接有效或手动上传图片'))
      }

      const { imageTexts, summary } = await AiAnalyzer.analyzePost(imageUrls, insp.description || '')

      // 本地文件名列表（下载成功的）
      const localFiles = imageTexts.filter(r => r.file).map(r => r.file)
      // 每图OCR JSON
      const imageTextsJson = JSON.stringify(imageTexts.map(r => ({ file: r.file, url: r.url, text: r.text })))

      await db.query(
        'UPDATE inspiration SET content_summary = ?, image_texts = ?, images = COALESCE(?, images), update_time = NOW() WHERE id = ?',
        [summary, imageTextsJson, localFiles.length ? localFiles.join(',') : null, id]
      )

      res.json(Response.success({ ocrCount: imageTexts.length, downloaded: localFiles.length, summary }, 'AI分析完成'))
    } catch (error) {
      next(error)
    }
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
      const { title, author, description, content_summary, image_texts } = req.body

      const updates = []
      const params = []
      if (title !== undefined) { updates.push('title = ?'); params.push(title) }
      if (author !== undefined) { updates.push('author = ?'); params.push(author) }
      if (description !== undefined) { updates.push('description = ?'); params.push(description) }
      if (content_summary !== undefined) { updates.push('content_summary = ?'); params.push(content_summary) }
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
   * 新增收藏夹
   * POST /api/inspiration-folders
   */
  async createFolder(req, res, next) {
    try {
      const { folder_name, folder_type = 'personal', parent_id = 0, description, sort = 0, is_public = 0 } = req.body

      if (!folder_name) {
        return res.status(400).json(Response.badRequest('收藏夹名称不能为空'))
      }

      const sql = `
        INSERT INTO inspiration_folder (folder_name, folder_type, parent_id, description, sort, is_public, create_user_id, create_time, update_time, is_delete)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `
      const result = await db.query(sql, [folder_name, folder_type, parent_id, description, sort, is_public, req.user?.id])

      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new InspirationController()
