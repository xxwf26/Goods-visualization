/**
 * 价格查询 API 路由
 * GET /api/price/query - 价格查询
 * GET /api/price/stats - 价格统计
 */
const express = require('express')
const router = express.Router()
const db = require('../config/database')

// 安全数字转换（mysql2 返回 DECIMAL 是字符串）
const toNum = (val, decimals = 2) => {
  const n = Number(val)
  return Number.isFinite(n) ? Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals) : 0
}

/**
 * 价格查询
 * GET /api/price/query
 * 参数：
 *   - category_tag_ids: 品类标签ID（逗号分隔）
 *   - craft_tag_ids: 工艺标签ID（逗号分隔）
 *   - quantity: 目标数量
 *   - quantity_tolerance: 数量容差比例（默认0.3，即30%）
 *   - supplier_id: 供应商ID
 *   - start_date: 开始日期
 *   - end_date: 结束日期
 */
router.get('/query', async (req, res, next) => {
  try {
    const {
      category_tag_ids,
      craft_tag_ids,
      quantity,
      quantity_tolerance = 0.3,
      supplier_id,
      product_size,
      start_date,
      end_date
    } = req.query

    // 构建基础查询条件（MVP阶段包含所有状态）
    let whereClause = 'WHERE p.is_delete = 0 AND p.unit_price > 0'
    const params = []

    // 品类筛选
    if (category_tag_ids) {
      const categoryIds = category_tag_ids.split(',').map(id => id.trim())
      const categoryConditions = categoryIds.map(() => 'FIND_IN_SET(?, p.category_tag_ids) > 0').join(' OR ')
      whereClause += ` AND (${categoryConditions})`
      params.push(...categoryIds)
    }

    // 工艺筛选
    if (craft_tag_ids) {
      const craftIds = craft_tag_ids.split(',').map(id => id.trim())
      const craftConditions = craftIds.map(() => 'FIND_IN_SET(?, p.craft_tag_ids) > 0').join(' OR ')
      whereClause += ` AND (${craftConditions})`
      params.push(...craftIds)
    }

    // 供应商筛选
    if (supplier_id) {
      whereClause += ' AND p.supplier_id = ?'
      params.push(supplier_id)
    }

    // 尺寸筛选
    if (product_size) {
      whereClause += ' AND p.product_size LIKE ?'
      params.push(`%${product_size}%`)
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

    // 1. 基础统计（历史最高价、最低价、均价）
    const basicStatsSql = `
      SELECT 
        COUNT(*) as total_count,
        MAX(p.unit_price) as max_price,
        MIN(p.unit_price) as min_price,
        AVG(p.unit_price) as avg_price,
        MAX(p.total_amount) as max_total,
        MIN(p.total_amount) as min_total,
        AVG(p.total_amount) as avg_total,
        SUM(p.total_amount) as sum_total
      FROM project p
      ${whereClause}
    `
    const [basicStats] = await db.query(basicStatsSql, params)

    const result = {
      stats: {
        total_count: basicStats.total_count || 0,
        max_price: toNum(basicStats.max_price),
        min_price: toNum(basicStats.min_price),
        avg_price: toNum(basicStats.avg_price),
        max_total: toNum(basicStats.max_total),
        min_total: toNum(basicStats.min_total),
        avg_total: toNum(basicStats.avg_total),
        sum_total: toNum(basicStats.sum_total)
      },
      similar_quantity: [],
      supplier_history: [],
      supplier_comparison: [],
      recent_projects: []
    }

    // 2. 相近数量单价参考
    if (quantity) {
      const qty = parseInt(quantity)
      const tolerance = Math.max(Math.ceil(qty * parseFloat(quantity_tolerance)), 50)
      const minQty = qty - tolerance
      const maxQty = qty + tolerance

      const similarQtyParams = [...params, minQty, maxQty, qty]
      const similarQtySql = `
        SELECT 
          p.id,
          p.project_name,
          p.product_name,
          p.quantity,
          p.unit_price,
          p.total_amount,
          p.product_size,
          p.product_spec,
          p.sample_cycle,
          p.mass_production_cycle,
          p.create_time,
          s.supplier_name,
          GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_names,
          GROUP_CONCAT(DISTINCT t_cat.tag_name) as category_names
        FROM project p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        LEFT JOIN tag t_craft ON FIND_IN_SET(t_craft.id, p.craft_tag_ids) > 0
        LEFT JOIN tag t_cat ON FIND_IN_SET(t_cat.id, p.category_tag_ids) > 0
        ${whereClause}
          AND p.quantity >= ? AND p.quantity <= ?
        GROUP BY p.id
        ORDER BY ABS(p.quantity - ?) ASC
        LIMIT 10
      `
      result.similar_quantity = await db.query(similarQtySql, similarQtyParams)
    }

    // 3. 同供应商历史报价
    if (supplier_id) {
      const supplierHistorySql = `
        SELECT 
          p.supplier_id,
          s.supplier_name,
          COUNT(*) as project_count,
          AVG(p.unit_price) as avg_price,
          MIN(p.unit_price) as min_price,
          MAX(p.unit_price) as max_price,
          MAX(p.create_time) as latest_time
        FROM project p
        LEFT JOIN supplier s ON p.supplier_id = s.id
        ${whereClause}
        GROUP BY p.supplier_id, s.supplier_name
        ORDER BY avg_price ASC
      `
      const supplierHistory = await db.query(supplierHistorySql, params)
      
      // 获取每个供应商的价格趋势
      for (const supplier of supplierHistory) {
        const trendSql = `
          SELECT unit_price, create_time
          FROM project p
          WHERE supplier_id = ? AND is_delete = 0 AND status IN ('completed', 'approved') AND unit_price > 0
          ORDER BY create_time DESC
          LIMIT 6
        `
        const trend = await db.query(trendSql, [supplier.supplier_id])
        supplier.trend = trend.map(t => t.unit_price).reverse()
        supplier.avg_price = toNum(supplier.avg_price)
        supplier.min_price = toNum(supplier.min_price)
        supplier.max_price = toNum(supplier.max_price)
      }
      result.supplier_history = supplierHistory
    }

    // 4. 跨供应商价格对比
    const supplierCompareSql = `
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
    const supplierCompare = await db.query(supplierCompareSql, params)
    
    // 计算价格优势百分比
    const avgPrice = result.stats.avg_price
    for (const supplier of supplierCompare) {
      supplier.avg_price = toNum(supplier.avg_price)
      supplier.min_price = toNum(supplier.min_price)
      supplier.max_price = toNum(supplier.max_price)
      // 价格优势 = (均价差 / 均价) * 100，越低越有优势
      supplier.advantage = avgPrice > 0 ? Math.round(((avgPrice - supplier.avg_price) / avgPrice) * 100) : 0
    }
    result.supplier_comparison = supplierCompare

    // 5. 最近的历史项目明细
    const recentProjectsSql = `
      SELECT 
        p.id,
        p.project_name,
        p.product_name,
        p.quantity,
        p.unit_price,
        p.total_amount,
        p.product_size,
        p.create_time,
        s.supplier_name,
        GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_names,
        GROUP_CONCAT(DISTINCT t_cat.tag_name) as category_names
      FROM project p
      LEFT JOIN supplier s ON p.supplier_id = s.id
      LEFT JOIN tag t_craft ON FIND_IN_SET(t_craft.id, p.craft_tag_ids) > 0
      LEFT JOIN tag t_cat ON FIND_IN_SET(t_cat.id, p.category_tag_ids) > 0
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.create_time DESC
      LIMIT 20
    `
    result.recent_projects = await db.query(recentProjectsSql, params)

    res.json({
      code: 200,
      message: '查询成功',
      data: result
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 价格统计概览
 * GET /api/price/stats
 * 返回各类别的价格统计
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { top = 10 } = req.query

    // 按品类统计
    const categoryStatsSql = `
      SELECT 
        t.id as tag_id,
        t.tag_name,
        t.tag_code,
        COUNT(p.id) as project_count,
        AVG(p.unit_price) as avg_price,
        MIN(p.unit_price) as min_price,
        MAX(p.unit_price) as max_price,
        SUM(p.total_amount) as total_amount
      FROM tag t
      LEFT JOIN project p ON FIND_IN_SET(t.id, p.category_tag_ids) > 0
        AND p.is_delete = 0 AND p.unit_price > 0
      WHERE t.tag_type = 'category' AND t.is_delete = 0
      GROUP BY t.id, t.tag_name, t.tag_code
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT ?
    `
    const categoryStats = await db.query(categoryStatsSql, [parseInt(top)])

    // 按工艺统计
    const craftStatsSql = `
      SELECT 
        t.id as tag_id,
        t.tag_name,
        t.tag_code,
        COUNT(p.id) as project_count,
        AVG(p.unit_price) as avg_price,
        MIN(p.unit_price) as min_price,
        MAX(p.unit_price) as max_price
      FROM tag t
      LEFT JOIN project p ON FIND_IN_SET(t.id, p.craft_tag_ids) > 0
        AND p.is_delete = 0 AND p.unit_price > 0
      WHERE t.tag_type = 'craft' AND t.is_delete = 0
      GROUP BY t.id, t.tag_name, t.tag_code
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT ?
    `
    const craftStats = await db.query(craftStatsSql, [parseInt(top)])

    // 按IP统计
    const ipStatsSql = `
      SELECT 
        t.id as tag_id,
        t.tag_name,
        t.tag_code,
        COUNT(p.id) as project_count,
        AVG(p.unit_price) as avg_price,
        SUM(p.total_amount) as total_amount
      FROM tag t
      LEFT JOIN project p ON FIND_IN_SET(t.id, p.ip_tag_ids) > 0
        AND p.is_delete = 0 AND p.unit_price > 0
      WHERE t.tag_type = 'ip' AND t.is_delete = 0
      GROUP BY t.id, t.tag_name, t.tag_code
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT ?
    `
    const ipStats = await db.query(ipStatsSql, [parseInt(top)])

    // 价格趋势（按月）
    const trendSql = `
      SELECT 
        DATE_FORMAT(p.create_time, '%Y-%m') as month,
        COUNT(*) as project_count,
        AVG(p.unit_price) as avg_price,
        MIN(p.unit_price) as min_price,
        MAX(p.unit_price) as max_price,
        SUM(p.total_amount) as total_amount
      FROM project p
      WHERE p.is_delete = 0 AND p.unit_price > 0
      GROUP BY DATE_FORMAT(p.create_time, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `
    const trend = await db.query(trendSql)

    // 格式化数据
    const formatStats = (stats) => stats.map(s => ({
      ...s,
      avg_price: toNum(s.avg_price),
      min_price: toNum(s.min_price),
      max_price: toNum(s.max_price),
      total_amount: toNum(s.total_amount)
    }))

    res.json({
      code: 200,
      message: '查询成功',
      data: {
        by_category: formatStats(categoryStats),
        by_craft: formatStats(craftStats),
        by_ip: formatStats(ipStats),
        trend: trend.map(t => ({
          ...t,
          avg_price: toNum(t.avg_price),
          min_price: toNum(t.min_price),
          max_price: toNum(t.max_price),
          total_amount: toNum(t.total_amount)
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 品类详情页数据
 * GET /api/price/category/:id
 * 返回指定品类的完整数据
 */
router.get('/category/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { top = 10 } = req.query

    // 获取品类信息
    const [category] = await db.query(
      'SELECT * FROM tag WHERE id = ? AND tag_type = ? AND is_delete = 0',
      [id, 'category']
    )

    if (!category) {
      return res.status(404).json({ code: 404, message: '品类不存在' })
    }

    // 该品类的历史项目
    const projectsSql = `
      SELECT 
        p.id,
        p.project_name,
        p.product_name,
        p.quantity,
        p.unit_price,
        p.total_amount,
        p.product_size,
        p.sample_cycle,
        p.mass_production_cycle,
        p.create_time,
        s.supplier_name,
        s.id as supplier_id,
        GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_names
      FROM project p
      LEFT JOIN supplier s ON p.supplier_id = s.id
      LEFT JOIN tag t_craft ON FIND_IN_SET(t_craft.id, p.craft_tag_ids) > 0
      WHERE FIND_IN_SET(?, p.category_tag_ids) > 0
        AND p.is_delete = 0
      GROUP BY p.id
      ORDER BY p.create_time DESC
      LIMIT ?
    `
    const projects = await db.query(projectsSql, [id, parseInt(top)])

    // 价格统计
    const statsSql = `
      SELECT 
        COUNT(*) as project_count,
        AVG(p.unit_price) as avg_price,
        MIN(p.unit_price) as min_price,
        MAX(p.unit_price) as max_price,
        AVG(p.quantity) as avg_quantity,
        SUM(p.total_amount) as total_amount
      FROM project p
      WHERE FIND_IN_SET(?, p.category_tag_ids) > 0
        AND p.is_delete = 0
    `
    const [stats] = await db.query(statsSql, [id])

    // 关联的外部灵感
    const inspirationsSql = `
      SELECT 
        i.id,
        i.title,
        i.source_type,
        i.source_url,
        i.cover_image,
        i.description,
        i.like_count,
        i.save_count,
        i.collection_status,
        GROUP_CONCAT(DISTINCT t_craft.tag_name) as craft_names
      FROM inspiration i
      LEFT JOIN tag t_craft ON FIND_IN_SET(t_craft.id, i.craft_tag_ids) > 0
      WHERE FIND_IN_SET(?, i.category_tag_ids) > 0 
        AND i.is_delete = 0
      GROUP BY i.id
      ORDER BY i.create_time DESC
      LIMIT ?
    `
    const inspirations = await db.query(inspirationsSql, [id, parseInt(top)])

    // 推荐供应商
    const suppliersSql = `
      SELECT 
        s.id,
        s.supplier_name,
        COUNT(p.id) as project_count,
        AVG(p.unit_price) as avg_price,
        MIN(p.unit_price) as min_price,
        MAX(p.unit_price) as max_price,
        MAX(p.create_time) as latest_time
      FROM supplier s
      LEFT JOIN project p ON s.id = p.supplier_id
        AND FIND_IN_SET(?, p.category_tag_ids) > 0
        AND p.is_delete = 0
      WHERE s.is_delete = 0
      GROUP BY s.id, s.supplier_name
      HAVING project_count > 0
      ORDER BY project_count DESC
      LIMIT ?
    `
    const suppliers = await db.query(suppliersSql, [id, parseInt(top)])

    res.json({
      code: 200,
      message: '查询成功',
      data: {
        category,
        stats: {
          project_count: stats.project_count || 0,
          avg_price: toNum(stats.avg_price),
          min_price: toNum(stats.min_price),
          max_price: toNum(stats.max_price),
          avg_quantity: stats.avg_quantity ? Math.round(Number(stats.avg_quantity)) : 0,
          total_amount: toNum(stats.total_amount)
        },
        projects: projects.map(p => ({
          ...p,
          unit_price: toNum(p.unit_price),
          total_amount: toNum(p.total_amount)
        })),
        inspirations,
        suppliers: suppliers.map(s => ({
          ...s,
          avg_price: toNum(s.avg_price),
          min_price: toNum(s.min_price),
          max_price: toNum(s.max_price)
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
