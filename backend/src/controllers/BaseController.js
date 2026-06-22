/**
 * 基础 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

class BaseController {
  constructor(modelName) {
    this.modelName = modelName
  }

  /**
   * 分页查询
   */
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 10, ...filters } = req.query
      const offset = (page - 1) * pageSize
      
      let whereClause = 'WHERE is_delete = 0'
      const params = []
      
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          if (key.includes('Ids') || key === 'ids') {
            whereClause += ` AND ${key} LIKE ?`
            params.push(`%${value}%`)
          } else if (key.includes('_like')) {
            const field = key.replace('_like', '')
            whereClause += ` AND ${field} LIKE ?`
            params.push(`%${value}%`)
          } else if (key.includes('_gte')) {
            const field = key.replace('_gte', '')
            whereClause += ` AND ${field} >= ?`
            params.push(value)
          } else if (key.includes('_lte')) {
            const field = key.replace('_lte', '')
            whereClause += ` AND ${field} <= ?`
            params.push(value)
          } else {
            whereClause += ` AND ${key} = ?`
            params.push(value)
          }
        }
      }

      const countSql = `SELECT COUNT(*) as total FROM ${this.modelName} ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      const listSql = `SELECT * FROM ${this.modelName} ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
      const listParams = [...params, parseInt(pageSize), parseInt(offset)]
      const list = await db.query(listSql, listParams)

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
   * 根据ID查询详情
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params
      const sql = `SELECT * FROM ${this.modelName} WHERE id = ? AND is_delete = 0`
      const [result] = await db.query(sql, [id])
      
      if (!result) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(result))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增
   */
  async create(req, res, next) {
    try {
      const data = req.body
      data.create_user_id = req.user?.id
      data.create_time = new Date()
      data.update_time = new Date()
      data.is_delete = 0

      const fields = Object.keys(data)
      const values = Object.values(data)
      const placeholders = fields.map(() => '?').join(', ')
      
      const sql = `INSERT INTO ${this.modelName} (${fields.join(', ')}) VALUES (${placeholders})`
      const result = await db.query(sql, values)
      
      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const data = req.body
      data.update_time = new Date()
      
      delete data.id
      delete data.create_time
      delete data.is_delete

      const updates = Object.keys(data).map(key => `${key} = ?`).join(', ')
      const values = [...Object.values(data), id]
      
      const sql = `UPDATE ${this.modelName} SET ${updates} WHERE id = ? AND is_delete = 0`
      const result = await db.query(sql, values)
      
      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 管理员专属删除（软删除）
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      const userRoles = req.user?.role_codes || []
      if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      const sql = `UPDATE ${this.modelName} SET is_delete = 1, update_time = ? WHERE id = ? AND is_delete = 0`
      const result = await db.query(sql, [new Date(), id])
      
      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = BaseController
