/**
 * 周边价格登记 Controller
 * 对应 Excel 表: 周边价格登记（仅国服）
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

class PriceRecordController {
  /**
   * 价格记录列表
   * GET /api/price-records
   */
  async list(req, res, next) {
    try {
      const {
        page = 1, pageSize = 20, keyword, category, ip, supplier_name,
        project_name, sort_field = 'create_time', sort_order = 'DESC'
      } = req.query

      const offset = (page - 1) * pageSize
      let whereClause = 'WHERE is_delete = 0'
      const params = []

      if (keyword) {
        whereClause += ` AND (product_name LIKE ? OR category LIKE ? OR ip LIKE ? OR supplier_name LIKE ? OR project_name LIKE ? OR remark1 LIKE ?)`
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      if (category) {
        whereClause += ' AND category LIKE ?'
        params.push(`%${category}%`)
      }

      if (ip) {
        whereClause += ' AND ip LIKE ?'
        params.push(`%${ip}%`)
      }

      if (supplier_name) {
        whereClause += ' AND supplier_name LIKE ?'
        params.push(`%${supplier_name}%`)
      }

      if (project_name) {
        whereClause += ' AND project_name LIKE ?'
        params.push(`%${project_name}%`)
      }

      // 单价区间
      if (req.query.min_price) {
        whereClause += ' AND unit_price >= ?'
        params.push(req.query.min_price)
      }
      if (req.query.max_price) {
        whereClause += ' AND unit_price <= ?'
        params.push(req.query.max_price)
      }

      const validSortFields = ['create_time', 'update_time', 'unit_price', 'total_price', 'total_quantity']
      const sortField = validSortFields.includes(sort_field) ? sort_field : 'create_time'
      const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      const countSql = `SELECT COUNT(*) as total FROM price_record ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      const listSql = `
        SELECT * FROM price_record
        ${whereClause}
        ORDER BY ${sortField} ${sortOrder}
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
   * 价格记录详情
   * GET /api/price-records/:id
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params
      const sql = 'SELECT * FROM price_record WHERE id = ? AND is_delete = 0'
      const [record] = await db.query(sql, [id])

      if (!record) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(record))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增价格记录
   * POST /api/price-records
   */
  async create(req, res, next) {
    try {
      const v = validate(req.body)
        .required(['product_name'])
        .maxLength('product_name', 200)

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const {
        product_name, category, supplier_name, ip, image, project_name,
        sample_days, mass_production_days, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee,
        total_price, production_info, remark1, remark2
      } = req.body

      const sql = `
        INSERT INTO price_record (
          product_name, category, supplier_name, ip, image, project_name,
          sample_days, mass_production_days, style_count, single_quantity,
          design_fee, sample_fee, unit_price, total_quantity, other_fee,
          total_price, production_info, remark1, remark2,
          create_user_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        product_name, category, supplier_name, ip, image, project_name,
        sample_days, mass_production_days, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee,
        total_price, production_info, remark1, remark2,
        req.user?.id
      ])

      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑价格记录
   * PUT /api/price-records/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const {
        product_name, category, supplier_name, ip, image, project_name,
        sample_days, mass_production_days, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee,
        total_price, production_info, remark1, remark2
      } = req.body

      const sql = `
        UPDATE price_record SET
          product_name = COALESCE(?, product_name),
          category = COALESCE(?, category),
          supplier_name = COALESCE(?, supplier_name),
          ip = COALESCE(?, ip),
          image = COALESCE(?, image),
          project_name = COALESCE(?, project_name),
          sample_days = COALESCE(?, sample_days),
          mass_production_days = COALESCE(?, mass_production_days),
          style_count = COALESCE(?, style_count),
          single_quantity = COALESCE(?, single_quantity),
          design_fee = COALESCE(?, design_fee),
          sample_fee = COALESCE(?, sample_fee),
          unit_price = COALESCE(?, unit_price),
          total_quantity = COALESCE(?, total_quantity),
          other_fee = COALESCE(?, other_fee),
          total_price = COALESCE(?, total_price),
          production_info = COALESCE(?, production_info),
          remark1 = COALESCE(?, remark1),
          remark2 = COALESCE(?, remark2),
          update_time = NOW()
        WHERE id = ? AND is_delete = 0
      `

      const result = await db.query(sql, [
        product_name, category, supplier_name, ip, image, project_name,
        sample_days, mass_production_days, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee,
        total_price, production_info, remark1, remark2,
        id
      ])

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除价格记录
   * DELETE /api/price-records/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      const result = await db.query(
        'UPDATE price_record SET is_delete = 1, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('记录不存在'))
      }

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new PriceRecordController()