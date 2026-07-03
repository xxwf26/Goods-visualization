/**
 * 标签 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

class TagController {
  /**
   * 标签列表
   * GET /api/tags
   */
  async list(req, res, next) {
    try {
      const { tag_type, parent_id, status, keyword, page = 1, pageSize = 100 } = req.query
      const offset = (page - 1) * pageSize
      
      let whereClause = 'WHERE is_delete = 0'
      const params = []

      if (tag_type) {
        whereClause += ' AND tag_type = ?'
        params.push(tag_type)
      }

      if (parent_id !== undefined) {
        whereClause += ' AND parent_id = ?'
        params.push(parent_id)
      }

      if (status !== undefined) {
        whereClause += ' AND status = ?'
        params.push(status)
      }

      if (keyword) {
        whereClause += ' AND (tag_name LIKE ? OR tag_code LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`)
      }

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM tag ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      // 查询列表
      const listSql = `
        SELECT * FROM tag ${whereClause} 
        ORDER BY tag_type, sort ASC, id ASC 
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
   * 获取标签树形结构
   * GET /api/tags/tree
   */
  async tree(req, res, next) {
    try {
      const { tag_type } = req.query
      
      let whereClause = 'WHERE is_delete = 0'
      if (tag_type) {
        whereClause += ' AND tag_type = ?'
      }

      const sql = `SELECT * FROM tag ${whereClause} ORDER BY sort ASC, id ASC`
      const list = await db.query(sql, tag_type ? [tag_type] : [])

      // 构建树形结构
      const tree = TagController.buildTree(list)

      res.json(Response.success(tree))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 构建树形结构
   */
  static buildTree(list, parentId = 0) {
    return list
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: TagController.buildTree(list, item.id)
      }))
  }

  /**
   * 标签详情
   * GET /api/tags/:id
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params
      const [tag] = await db.query('SELECT * FROM tag WHERE id = ? AND is_delete = 0', [id])

      if (!tag) {
        return res.status(404).json(Response.notFound('标签不存在'))
      }

      res.json(Response.success(tag))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增标签
   * POST /api/tags
   */
  async create(req, res, next) {
    try {
      const v = validate(req.body)
        .required(['tag_name', 'tag_type'])
        .maxLength('tag_name', 100)
        .maxLength('tag_code', 100)
        .isIn('tag_type', ['ip', 'category', 'craft', 'scene'])

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const { tag_name, tag_code, tag_type, parent_id = 0, level = 1, color, icon, description, sort = 0, status = 1 } = req.body

      // 检查编码唯一性
      if (tag_code) {
        const [exists] = await db.query('SELECT id FROM tag WHERE tag_code = ? AND is_delete = 0', [tag_code])
        if (exists) {
          return res.status(400).json(Response.badRequest('标签编码已存在'))
        }
      }

      const sql = `
        INSERT INTO tag (tag_name, tag_code, tag_type, parent_id, level, color, icon, description, sort, status, create_time, update_time, is_delete)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `
      const result = await db.query(sql, [tag_name, tag_code, tag_type, parent_id, level, color, icon, description, sort, status])

      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑标签
   * PUT /api/tags/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const { tag_name, tag_code, tag_type, parent_id, level, color, icon, description, sort, status } = req.body

      const v = validate(req.body)
        .maxLength('tag_name', 100)
        .maxLength('tag_code', 100)
        .isIn('tag_type', ['ip', 'category', 'craft', 'scene'])

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      // 检查标签是否存在
      const [tag] = await db.query('SELECT id FROM tag WHERE id = ? AND is_delete = 0', [id])
      if (!tag) {
        return res.status(404).json(Response.notFound('标签不存在'))
      }

      // 检查编码唯一性
      if (tag_code) {
        const [exists] = await db.query('SELECT id FROM tag WHERE tag_code = ? AND is_delete = 0 AND id != ?', [tag_code, id])
        if (exists) {
          return res.status(400).json(Response.badRequest('标签编码已存在'))
        }
      }

      const sql = `
        UPDATE tag SET 
          tag_name = COALESCE(?, tag_name),
          tag_code = COALESCE(?, tag_code),
          tag_type = COALESCE(?, tag_type),
          parent_id = COALESCE(?, parent_id),
          level = COALESCE(?, level),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          description = COALESCE(?, description),
          sort = COALESCE(?, sort),
          status = COALESCE(?, status),
          update_time = NOW()
        WHERE id = ? AND is_delete = 0
      `
      const result = await db.query(sql, [tag_name, tag_code, tag_type, parent_id, level, color, icon, description, sort, status, id])

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('标签不存在'))
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除标签（管理员专属）
   * DELETE /api/tags/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      // 权限检查
      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      // 检查标签是否存在
      const [tag] = await db.query('SELECT id FROM tag WHERE id = ? AND is_delete = 0', [id])
      if (!tag) {
        return res.status(404).json(Response.notFound('标签不存在'))
      }

      // 检查是否有子标签
      const children = await db.query('SELECT id FROM tag WHERE parent_id = ? AND is_delete = 0', [id])
      if (children && children.length > 0) {
        return res.status(400).json(Response.badRequest('请先删除子标签'))
      }

      const result = await db.query('UPDATE tag SET is_delete = 1, update_time = NOW() WHERE id = ?', [id])

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批量导入标签
   * POST /api/tags/batch
   */
  async batchImport(req, res, next) {
    try {
      const { tags } = req.body

      if (!Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json(Response.badRequest('请提供有效的标签数据'))
      }

      const validTypes = ['ip', 'category', 'craft', 'scene']
      const results = {
        success: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i]
        
        if (!tag.tag_name || !tag.tag_type) {
          results.failed++
          results.errors.push(`第${i + 1}行: 标签名称和类型必填`)
          continue
        }

        if (!validTypes.includes(tag.tag_type)) {
          results.failed++
          results.errors.push(`第${i + 1}行: 无效的标签类型`)
          continue
        }

        try {
          const sql = `
            INSERT INTO tag (tag_name, tag_code, tag_type, parent_id, level, color, icon, description, sort, status, create_time, update_time, is_delete)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
          `
          await db.query(sql, [
            tag.tag_name,
            tag.tag_code || null,
            tag.tag_type,
            tag.parent_id || 0,
            tag.level || 1,
            tag.color || null,
            tag.icon || null,
            tag.description || null,
            tag.sort || 0,
            tag.status !== undefined ? tag.status : 1
          ])
          results.success++
        } catch (err) {
          results.failed++
          results.errors.push(`第${i + 1}行: ${err.message}`)
        }
      }

      res.json(Response.success(results, '批量导入完成'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new TagController()
