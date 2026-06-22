/**
 * 外部灵感 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

class InspirationController {
  /**
   * 灵感列表（筛选、搜索）
   * GET /api/inspirations
   */
  async list(req, res, next) {
    try {
      const {
        page = 1, pageSize = 10, keyword, inspiration_type, source_type,
        collection_status, folder_id, is_featured, is_pinned,
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
        title, inspiration_type, source_type, source_type, source_name, source_url, source_url, author, author_url,
        ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids,
        description, reference_value, content_summary, notes, application_scenario,
        cover_image, images, video_url, thumbnail,
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
      const {
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
