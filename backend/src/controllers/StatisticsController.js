/**
 * 价格统计 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

class StatisticsController {
  /**
   * 价格统计分析
   * GET /api/statistics/price
   */
  async priceAnalysis(req, res, next) {
    try {
      const {
        category_tag_ids,
        craft_tag_ids,
        quantity,
        supplier_id,
        start_date,
        end_date
      } = req.query

      let whereClause = 'WHERE p.is_delete = 0 AND p.unit_price > 0'
      const params = []

      // 品类标签筛选
      if (category_tag_ids) {
        whereClause += ' AND p.category_tag_ids LIKE ?'
        params.push(`%${category_tag_ids}%`)
      }

      // 工艺标签筛选
      if (craft_tag_ids) {
        whereClause += ' AND p.craft_tag_ids LIKE ?'
        params.push(`%${craft_tag_ids}%`)
      }

      // 供应商筛选
      if (supplier_id) {
        whereClause += ' AND p.supplier_id = ?'
        params.push(supplier_id)
      }

      // 日期范围
      if (start_date) {
        whereClause += ' AND p.create_time >= ?'
        params.push(start_date)
      }
      if (end_date) {
        whereClause += ' AND p.create_time <= ?'
        params.push(end_date)
      }

      // 基础统计（历史最高价、最低价、均价）
      const basicStatsSql = `
        SELECT 
          COUNT(*) as total_count,
          MAX(p.unit_price) as max_price,
          MIN(p.unit_price) as min_price,
          AVG(p.unit_price) as avg_price,
          MAX(p.total_amount) as max_total,
          MIN(p.total_amount) as min_total,
          AVG(p.total_amount) as avg_total
        FROM project p
        ${whereClause}
      `
      const [basicStats] = await db.query(basicStatsSql, params)

      const result = {
        basic: {
          total_count: basicStats.total_count || 0,
          max_price: basicStats.max_price || 0,
          min_price: basicStats.min_price || 0,
          avg_price: basicStats.avg_price ? Math.round(Number(basicStats.avg_price) * 100) / 100 : 0,
          max_total: basicStats.max_total || 0,
          min_total: basicStats.min_total || 0,
          avg_total: basicStats.avg_total ? Math.round(Number(basicStats.avg_total) * 100) / 100 : 0
        },
        by_quantity: [],
        by_supplier: [],
        by_category: [],
        by_craft: [],
        trends: []
      }

      // 相近数量价格分析
      if (quantity) {
        const qty = parseInt(quantity)
        const tolerance = Math.max(Math.ceil(qty * 0.3), 50) // 30% 容差，最少50
        const minQty = qty - tolerance
        const maxQty = qty + tolerance

        const quantityPriceSql = `
          SELECT 
            p.quantity,
            p.unit_price,
            p.total_amount,
            p.product_name,
            p.project_name,
            p.create_time,
            s.supplier_name
          FROM project p
          LEFT JOIN supplier s ON p.supplier_id = s.id
          ${whereClause}
            AND p.quantity >= ? AND p.quantity <= ?
          ORDER BY ABS(p.quantity - ?) ASC
          LIMIT 10
        `
        const quantityPrices = await db.query(quantityPriceSql, [...params, minQty, maxQty, qty])
        result.by_quantity = quantityPrices
      }

      // 按供应商价格分布
      const supplierStatsSql = `
        SELECT 
          p.supplier_id,
          s.supplier_name,
          COUNT(*) as project_count,
          AVG(p.unit_price) as avg_price,
          MIN(p.unit_price) as min_price,
          MAX(p.unit_price) as max_price
        FROM project p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        ${whereClause} AND p.supplier_id IS NOT NULL
        GROUP BY p.supplier_id, s.supplier_name
        ORDER BY avg_price ASC
      `
      result.by_supplier = await db.query(supplierStatsSql, params)

      // 按品类价格分布
      if (category_tag_ids) {
        const categoryStatsSql = `
          SELECT 
            t.id as tag_id,
            t.tag_name,
            COUNT(*) as project_count,
            AVG(p.unit_price) as avg_price,
            MIN(p.unit_price) as min_price,
            MAX(p.unit_price) as max_price
          FROM project p
          JOIN tag t ON FIND_IN_SET(t.id, p.category_tag_ids) > 0
          ${whereClause} AND t.id = ?
          GROUP BY t.id, t.tag_name
        `
        result.by_category = await db.query(categoryStatsSql, [...params, category_tag_ids])
      }

      // 按工艺价格分布
      if (craft_tag_ids) {
        const craftStatsSql = `
          SELECT 
            t.id as tag_id,
            t.tag_name,
            COUNT(*) as project_count,
            AVG(p.unit_price) as avg_price,
            MIN(p.unit_price) as min_price,
            MAX(p.unit_price) as max_price
          FROM project p
          JOIN tag t ON FIND_IN_SET(t.id, p.craft_tag_ids) > 0
          ${whereClause} AND t.id = ?
          GROUP BY t.id, t.tag_name
        `
        result.by_craft = await db.query(craftStatsSql, [...params, craft_tag_ids])
      }

      // 价格趋势（按月）
      const trendsSql = `
        SELECT 
          DATE_FORMAT(p.create_time, '%Y-%m') as month,
          COUNT(*) as project_count,
          AVG(p.unit_price) as avg_price,
          MIN(p.unit_price) as min_price,
          MAX(p.unit_price) as max_price
        FROM project p
        ${whereClause}
        GROUP BY DATE_FORMAT(p.create_time, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `
      result.trends = await db.query(trendsSql, params)

      res.json(Response.success(result))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取参考价格（基于相似项目）
   * GET /api/statistics/reference-price
   */
  async referencePrice(req, res, next) {
    try {
      const { category_tag_ids, craft_tag_ids, quantity, supplier_id } = req.query

      if (!category_tag_ids && !craft_tag_ids) {
        return res.status(400).json(Response.badRequest('请提供品类或工艺标签'))
      }

      let whereClause = 'WHERE p.is_delete = 0 AND p.unit_price > 0'
      const params = []

      if (category_tag_ids) {
        whereClause += ' AND p.category_tag_ids LIKE ?'
        params.push(`%${category_tag_ids}%`)
      }

      if (craft_tag_ids) {
        whereClause += ' AND p.craft_tag_ids LIKE ?'
        params.push(`%${craft_tag_ids}%`)
      }

      if (supplier_id) {
        whereClause += ' AND p.supplier_id = ?'
        params.push(supplier_id)
      }

      // 获取最相似的项目
      let orderBy = 'p.create_time DESC'
      let limitClause = 'LIMIT 5'

      if (quantity) {
        const qty = parseInt(quantity)
        const tolerance = Math.max(Math.ceil(qty * 0.5), 100)
        whereClause += ' AND p.quantity >= ? AND p.quantity <= ?'
        params.push(qty - tolerance, qty + tolerance)
        orderBy = 'ABS(p.quantity - ?) ASC'
        // ORDER BY 占位符的参数必须排在所有 WHERE 参数之后
        params.push(qty)
      }

      const sql = `
        SELECT
          p.id,
          p.project_name,
          p.product_name,
          p.quantity,
          p.unit_price,
          p.total_amount,
          p.product_spec,
          p.product_material,
          s.supplier_name,
          p.create_time
        FROM project p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        ${whereClause}
        ORDER BY ${orderBy}
        ${limitClause}
      `

      const similarProjects = await db.query(sql, params)

      // 计算参考价格区间
      let reference_price_range = { low: 0, medium: 0, high: 0 }

      if (similarProjects.length > 0) {
        const prices = similarProjects.map(p => p.unit_price)
        const sortedPrices = prices.sort((a, b) => a - b)
        
        reference_price_range = {
          low: sortedPrices[0],
          medium: sortedPrices[Math.floor(sortedPrices.length / 2)],
          high: sortedPrices[sortedPrices.length - 1]
        }
      }

      res.json(Response.success({
        similar_projects: similarProjects,
        reference_price_range
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 仪表盘统计数据
   * GET /api/statistics/dashboard
   */
  async dashboard(req, res, next) {
    try {
      // 项目统计（从 project 表）
      const [pc] = await db.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as total_amount FROM project WHERE is_delete=0')
      // 价格记录统计（从 price_record 表）
      const [prc] = await db.query('SELECT COUNT(*) as total, COUNT(DISTINCT supplier_name) as supplier_count FROM price_record WHERE is_delete=0')
      // 供应商统计
      const [sc] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN cooperation_status=\'active\' THEN 1 ELSE 0 END) as active FROM supplier WHERE is_delete=0')
      // 灵感统计
      const [ic] = await db.query('SELECT COUNT(*) as total FROM inspiration WHERE is_delete=0')

      // IP 分布 (从 project 表)
      const ipDist = await db.query("SELECT ip_tag_ids as name, COUNT(*) as value FROM project WHERE is_delete=0 AND ip_tag_ids IS NOT NULL AND ip_tag_ids!='' GROUP BY ip_tag_ids ORDER BY value DESC")

      // 品类分布 (从 price_record 表)
      const catDist = await db.query("SELECT category as name, COUNT(*) as count FROM price_record WHERE is_delete=0 AND category IS NOT NULL AND category!='' GROUP BY category ORDER BY count DESC")

      // 供应商排行 (从 supplier 表)
      const supRank = await db.query('SELECT supplier_name as name, cooperation_project_count as goodsCount, cooperation_total_amount as totalAmount FROM supplier WHERE is_delete=0 AND cooperation_project_count>0 ORDER BY cooperation_project_count DESC LIMIT 10')

      res.json(Response.success({
        projects: { total: pc.total||0, total_amount: pc.total_amount||0 },
        price_records: { total: prc.total||0, supplier_count: prc.supplier_count||0 },
        suppliers: { total: sc.total||0, active: sc.active||0 },
        inspirations: { total: ic.total||0 },
        ip_distribution: ipDist,
        category_distribution: catDist,
        supplier_ranking: supRank
      }))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new StatisticsController()
