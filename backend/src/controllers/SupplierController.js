/**
 * 供应商 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

class SupplierController {
  /**
   * 供应商列表（筛选、搜索）
   * GET /api/suppliers
   */
  async list(req, res, next) {
    try {
      const {
        page = 1,
        pageSize = 10,
        keyword,
        supplier_type,
        cooperation_status,
        province,
        city,
        rating,
        start_date,
        end_date,
        sort_field = 'create_time',
        sort_order = 'DESC'
      } = req.query

      const offset = (page - 1) * pageSize
      let whereClause = 'WHERE s.is_delete = 0'
      const params = []

      // 关键词搜索
      if (keyword) {
        whereClause += ` AND (s.supplier_name LIKE ? OR s.supplier_code LIKE ? OR s.contact_person LIKE ? OR s.main_products LIKE ?)`
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      // 供应商类型筛选
      if (supplier_type) {
        whereClause += ' AND s.supplier_type = ?'
        params.push(supplier_type)
      }

      // 合作状态筛选
      if (cooperation_status) {
        whereClause += ' AND s.cooperation_status = ?'
        params.push(cooperation_status)
      }

      // 合同类型筛选
      if (req.query.contract_type) {
        whereClause += ' AND s.contract_type = ?'
        params.push(req.query.contract_type)
      }

      // 省份筛选
      if (province) {
        whereClause += ' AND s.province = ?'
        params.push(province)
      }

      // 城市筛选
      if (city) {
        whereClause += ' AND s.city = ?'
        params.push(city)
      }

      // 评级筛选（百分制最低分）
      if (rating) {
        whereClause += ' AND s.rating >= ?'
        params.push(rating)
      }

      // 日期范围
      if (start_date) {
        whereClause += ' AND s.create_time >= ?'
        params.push(start_date)
      }
      if (end_date) {
        whereClause += ' AND s.create_time <= ?'
        params.push(end_date)
      }

      // 排序
      const validSortFields = ['create_time', 'update_time', 'supplier_name', 'rating']
      const sortField = validSortFields.includes(sort_field) ? sort_field : 'create_time'
      const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM supplier s ${whereClause}`
      const [countResult] = await db.query(countSql, params)
      const total = countResult.total

      // 查询列表（含项目统计）
      const listSql = `
        SELECT s.*,
               u.nickname as creator_name,
               COALESCE(ps.project_count, 0) as cooperation_project_count,
               COALESCE(ps.total_amount, 0) as cooperation_total_amount,
               ps.category_names
        FROM supplier s
        LEFT JOIN sys_user u ON s.create_user_id = u.id
        LEFT JOIN (
          SELECT p.supplier_id,
                 COUNT(*) as project_count,
                 SUM(p.total_amount) as total_amount,
                 GROUP_CONCAT(DISTINCT t.tag_name) as category_names
          FROM project p
          LEFT JOIN tag t ON FIND_IN_SET(t.id, p.category_tag_ids) > 0 AND t.tag_type = 'category'
          WHERE p.is_delete = 0 AND p.supplier_id IS NOT NULL
          GROUP BY p.supplier_id
        ) ps ON s.id = ps.supplier_id
        ${whereClause}
        ORDER BY s.${sortField} ${sortOrder}
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
   * 供应商详情
   * GET /api/suppliers/:id
   */
  async detail(req, res, next) {
    try {
      const { id } = req.params

      const sql = `
        SELECT s.*,
               u.nickname as creator_name
        FROM supplier s
        LEFT JOIN sys_user u ON s.create_user_id = u.id
        WHERE s.id = ? AND s.is_delete = 0
      `
      const [supplier] = await db.query(sql, [id])

      if (!supplier) {
        return res.status(404).json(Response.notFound('供应商不存在'))
      }

      // 获取评价统计
      const [evalStats] = await db.query(`
        SELECT 
          COUNT(*) as total_evaluations,
          AVG(overall_rating) as avg_rating,
          AVG(quality_rating) as avg_quality,
          AVG(delivery_rating) as avg_delivery,
          AVG(service_rating) as avg_service,
          AVG(price_rating) as avg_price
        FROM supplier_evaluation
        WHERE supplier_id = ? AND is_delete = 0
      `, [id])

      supplier.evaluation_stats = evalStats

      // 获取最近评价
      const [recentEvals] = await db.query(`
        SELECT e.*, u.nickname as evaluator_name
        FROM supplier_evaluation e
        LEFT JOIN sys_user u ON e.evaluator_id = u.id
        WHERE e.supplier_id = ? AND e.is_delete = 0
        ORDER BY e.create_time DESC
        LIMIT 5
      `, [id])

      supplier.recent_evaluations = recentEvals

      // 获取合作项目历史（P0-6: 场景4需求）
      const recentProjects = await db.query(`
        SELECT
          p.id,
          p.project_name,
          p.product_name,
          p.quantity,
          p.unit_price,
          p.total_amount,
          p.sample_cycle,
          p.mass_production_cycle,
          p.create_time,
          GROUP_CONCAT(DISTINCT t_cat.tag_name) as category_names,
          GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_names
        FROM project p
        LEFT JOIN tag t_cat ON FIND_IN_SET(t_cat.id, p.category_tag_ids) > 0
        LEFT JOIN tag t_craft ON FIND_IN_SET(t_craft.id, p.craft_tag_ids) > 0
        WHERE p.supplier_id = ? AND p.is_delete = 0
        GROUP BY p.id
        ORDER BY p.create_time DESC
        LIMIT 20
      `, [id])

      supplier.recent_projects = recentProjects.map(p => ({
        ...p,
        unit_price: p.unit_price ? Number(p.unit_price) : 0,
        total_amount: p.total_amount ? Number(p.total_amount) : 0
      }))

      // 合作品类统计
      const categoryStats = await db.query(`
        SELECT
          t.tag_name,
          COUNT(DISTINCT p.id) as project_count,
          MIN(p.unit_price) as min_price,
          MAX(p.unit_price) as max_price,
          AVG(p.unit_price) as avg_price
        FROM tag t
        JOIN project p ON FIND_IN_SET(t.id, p.category_tag_ids) > 0
        WHERE p.supplier_id = ? AND p.is_delete = 0 AND t.tag_type = 'category'
        GROUP BY t.id, t.tag_name
        ORDER BY project_count DESC
      `, [id])

      supplier.category_stats = categoryStats.map(c => ({
        ...c,
        min_price: c.min_price ? Number(c.min_price) : 0,
        max_price: c.max_price ? Number(c.max_price) : 0,
        avg_price: c.avg_price ? Number(c.avg_price) : 0
      }))

      res.json(Response.success(supplier))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增供应商
   * POST /api/suppliers
   */
  async create(req, res, next) {
    try {
      const v = validate(req.body)
        .required(['supplier_name'])
        .maxLength('supplier_name', 200)
        .maxLength('supplier_code', 50)

      if (!v.validate()) {
        return res.status(400).json(Response.badRequest(v.getFirstError()))
      }

      const {
        supplier_name,
        supplier_code,
        supplier_type,
        contact_person,
        contact_phone,
        contact_email,
        province,
        city,
        district,
        address,
        license_image,
        business_license,
        tax_rate,
        payment_days,
        min_order_amount,
        shipping_fee,
        cooperation_status = 'potential',
        rating,
        category_ids,
        main_products,
        advantage,
        remark,
        attachments,
        case_files
      } = req.body

      const sql = `
        INSERT INTO supplier (
          supplier_name, supplier_code, supplier_type, contact_person, contact_phone, contact_email,
          province, city, district, address, license_image, business_license,
          tax_rate, payment_days, min_order_amount, shipping_fee,
          cooperation_status, rating, category_ids, main_products, advantage, remark, attachments, case_files,
          create_user_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        supplier_name, supplier_code, supplier_type, contact_person, contact_phone, contact_email,
        province, city, district, address, license_image, business_license,
        tax_rate, payment_days, min_order_amount, shipping_fee,
        cooperation_status, rating, category_ids, main_products, advantage, remark, attachments, case_files,
        req.user?.id
      ])

      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 编辑供应商
   * PUT /api/suppliers/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params
      const {
        supplier_name,
        supplier_code,
        supplier_type,
        contact_person,
        contact_phone,
        contact_email,
        province,
        city,
        district,
        address,
        license_image,
        business_license,
        tax_rate,
        payment_days,
        min_order_amount,
        shipping_fee,
        cooperation_status,
        rating,
        category_ids,
        main_products,
        advantage,
        remark,
        attachments,
        case_files
      } = req.body

      const sql = `
        UPDATE supplier SET
          supplier_name = COALESCE(?, supplier_name),
          supplier_code = COALESCE(?, supplier_code),
          supplier_type = COALESCE(?, supplier_type),
          contact_person = COALESCE(?, contact_person),
          contact_phone = COALESCE(?, contact_phone),
          contact_email = COALESCE(?, contact_email),
          province = COALESCE(?, province),
          city = COALESCE(?, city),
          district = COALESCE(?, district),
          address = COALESCE(?, address),
          license_image = COALESCE(?, license_image),
          business_license = COALESCE(?, business_license),
          tax_rate = COALESCE(?, tax_rate),
          payment_days = COALESCE(?, payment_days),
          min_order_amount = COALESCE(?, min_order_amount),
          shipping_fee = COALESCE(?, shipping_fee),
          cooperation_status = COALESCE(?, cooperation_status),
          rating = COALESCE(?, rating),
          category_ids = COALESCE(?, category_ids),
          main_products = COALESCE(?, main_products),
          advantage = COALESCE(?, advantage),
          remark = COALESCE(?, remark),
          attachments = COALESCE(?, attachments),
          case_files = COALESCE(?, case_files),
          update_time = NOW()
        WHERE id = ? AND is_delete = 0
      `

      const result = await db.query(sql, [
        supplier_name, supplier_code, supplier_type, contact_person, contact_phone, contact_email,
        province, city, district, address, license_image, business_license,
        tax_rate, payment_days, min_order_amount, shipping_fee,
        cooperation_status, rating, category_ids, main_products, advantage, remark, attachments, case_files,
        id
      ])

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('供应商不存在'))
      }

      res.json(Response.success(null, '更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除供应商（管理员专属）
   * DELETE /api/suppliers/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params

      // 权限检查：仅管理员可删除
      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }

      const result = await db.query(
        'UPDATE supplier SET is_delete = 1, update_time = NOW() WHERE id = ? AND is_delete = 0',
        [id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json(Response.notFound('供应商不存在'))
      }

      res.json(Response.success(null, '删除成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 供应商评价
   * POST /api/suppliers/:id/evaluate
   */
  async evaluate(req, res, next) {
    try {
      const { id } = req.params
      const { project_id, quality_rating, delivery_rating, service_rating, price_rating, evaluation_content, pros, cons, images } = req.body

      // 验证评分
      if (!quality_rating || !delivery_rating || !service_rating || !price_rating) {
        return res.status(400).json(Response.badRequest('请完成所有评分'))
      }

      const ratings = [quality_rating, delivery_rating, service_rating, price_rating]
      if (ratings.some(r => r < 1 || r > 5)) {
        return res.status(400).json(Response.badRequest('评分必须在1-5之间'))
      }

      const overall_rating = ((quality_rating + delivery_rating + service_rating + price_rating) / 4).toFixed(1)

      const sql = `
        INSERT INTO supplier_evaluation (
          supplier_id, project_id, quality_rating, delivery_rating, service_rating, price_rating,
          overall_rating, evaluation_content, pros, cons, images, evaluator_id, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
      `

      const result = await db.query(sql, [
        id, project_id, quality_rating, delivery_rating, service_rating, price_rating,
        overall_rating, evaluation_content, pros, cons, images, req.user?.id
      ])

      // 更新供应商平均评级
      const [avgRating] = await db.query(
        'SELECT AVG(overall_rating) as avg FROM supplier_evaluation WHERE supplier_id = ? AND is_delete = 0',
        [id]
      )
      await db.query('UPDATE supplier SET rating = ? WHERE id = ?', [Math.round(avgRating.avg), id])

      res.json(Response.success({ id: result.insertId }, '评价成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new SupplierController()
