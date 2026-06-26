/**
 * 周边价格登记 Controller
 * 对应 Excel 表: 周边价格登记（仅国服）
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

/**
 * 数量/金额一致性校验
 * 规则（需求文档场景一/五）:
 *   款式数量 × 单款数量 = 总数量
 *   单价 × 总数量 = 总价
 * 仅当相关字段都提供了有效数字时才校验，缺字段时跳过（兼容部分编辑）。
 * @returns {string|null} 错误信息，校验通过返回 null
 */
function checkQuantityConsistency(body) {
  const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
  const styleCount = num(body.style_count)
  const singleQty = num(body.single_quantity)
  const totalQty = num(body.total_quantity)
  const unitPrice = num(body.unit_price)
  const totalPrice = num(body.total_price)

  // 款式数 × 单款数 = 总数量
  if (styleCount !== null && singleQty !== null && totalQty !== null) {
    if (styleCount * singleQty !== totalQty) {
      return `数量不一致：款式数量(${styleCount}) × 单款数量(${singleQty}) 应等于总数量(${totalQty})`
    }
  }

  // 单价 × 总数量 = 总价（浮点容差 0.01）
  if (unitPrice !== null && totalQty !== null && totalPrice !== null) {
    if (Math.abs(unitPrice * totalQty - totalPrice) > 0.01) {
      return `金额不一致：单价(${unitPrice}) × 总数量(${totalQty}) 应等于总价(${totalPrice})`
    }
  }

  return null
}

// 安全数字转换（mysql2 返回 DECIMAL 为字符串）
function toNum(val, decimals = 2) {
  const n = Number(val)
  return Number.isFinite(n) ? Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals) : 0
}

/**
 * 构建 price_record 的筛选条件（list 与 query 聚合共用，口径一致）
 */
function buildPriceWhere(query) {
  const { keyword, category, ip, supplier_name, project_name } = query
  let whereClause = 'WHERE is_delete = 0'
  const params = []

  if (keyword) {
    whereClause += ' AND (product_name LIKE ? OR category LIKE ? OR ip LIKE ? OR supplier_name LIKE ? OR project_name LIKE ? OR remark1 LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (category) { whereClause += ' AND category LIKE ?'; params.push(`%${category}%`) }
  if (ip) { whereClause += ' AND ip LIKE ?'; params.push(`%${ip}%`) }
  if (supplier_name) { whereClause += ' AND supplier_name LIKE ?'; params.push(`%${supplier_name}%`) }
  if (project_name) { whereClause += ' AND project_name LIKE ?'; params.push(`%${project_name}%`) }
  if (query.min_price) { whereClause += ' AND unit_price >= ?'; params.push(query.min_price) }
  if (query.max_price) { whereClause += ' AND unit_price <= ?'; params.push(query.max_price) }
  if (query.min_quantity) { whereClause += ' AND total_quantity >= ?'; params.push(query.min_quantity) }
  if (query.max_quantity) { whereClause += ' AND total_quantity <= ?'; params.push(query.max_quantity) }

  return { whereClause, params }
}

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

      // 数量区间
      if (req.query.min_quantity) {
        whereClause += ' AND total_quantity >= ?'
        params.push(req.query.min_quantity)
      }
      if (req.query.max_quantity) {
        whereClause += ' AND total_quantity <= ?'
        params.push(req.query.max_quantity)
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
   * 价格查询聚合（以 price_record 为权威数据源，服务端全量统计）
   * GET /api/price-records/query
   * 返回：stats(全量最高/最低/均价/匹配数)、supplier_comparison(按供应商对比)、records(明细)
   */
  async priceQuery(req, res, next) {
    try {
      const { whereClause, params } = buildPriceWhere(req.query)
      // 统计仅针对有效单价
      const statsWhere = whereClause + ' AND unit_price > 0'

      // 1. 全量基础统计
      const [basic] = await db.query(
        `SELECT COUNT(*) as total_count,
                MAX(unit_price) as max_price,
                MIN(unit_price) as min_price,
                AVG(unit_price) as avg_price,
                SUM(total_price) as sum_total
         FROM price_record ${statsWhere}`,
        params
      )

      // 2. 跨供应商价格对比（全量分组）
      const supplierRows = await db.query(
        `SELECT supplier_name,
                COUNT(*) as record_count,
                AVG(unit_price) as avg_price,
                MIN(unit_price) as min_price,
                MAX(unit_price) as max_price
         FROM price_record ${statsWhere} AND supplier_name IS NOT NULL AND supplier_name <> ''
         GROUP BY supplier_name
         ORDER BY avg_price ASC`,
        params
      )
      const avgAll = toNum(basic.avg_price)
      const supplier_comparison = supplierRows.map(s => ({
        supplier_name: s.supplier_name,
        record_count: s.record_count,
        avg_price: toNum(s.avg_price),
        min_price: toNum(s.min_price),
        max_price: toNum(s.max_price),
        // 价格优势：低于整体均价为正，越高越有优势
        advantage: avgAll > 0 ? Math.round(((avgAll - Number(s.avg_price)) / avgAll) * 100) : 0
      }))

      // 3. 明细（限制返回条数，仅用于展示）
      const records = await db.query(
        `SELECT * FROM price_record ${whereClause} ORDER BY create_time DESC LIMIT 200`,
        params
      )

      res.json(Response.success({
        stats: {
          total_count: basic.total_count || 0,
          max_price: toNum(basic.max_price),
          min_price: toNum(basic.min_price),
          avg_price: avgAll,
          sum_total: toNum(basic.sum_total)
        },
        supplier_comparison,
        records
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 报价审核参考（需求场景5）
   * GET /api/price-records/quote-review
   * 入参：category(必填)、supplier_name、quantity(目标数量)、quote_price(待审单价)
   * 返回：同品类历史价格区间、报价裁定(高于/低于均价%)、相近数量参考、同供应商历史、跨供应商对比
   */
  async quoteReview(req, res, next) {
    try {
      const { category, supplier_name, quantity, quote_price } = req.query
      if (!category) {
        return res.status(400).json(Response.badRequest('请选择品类'))
      }

      // 基础范围：同品类、有效单价
      const base = 'WHERE is_delete = 0 AND unit_price > 0 AND category LIKE ?'
      const baseParams = [`%${category}%`]

      // 1. 同品类历史价格区间
      const [range] = await db.query(
        `SELECT COUNT(*) total_count, MAX(unit_price) max_price, MIN(unit_price) min_price, AVG(unit_price) avg_price
         FROM price_record ${base}`,
        baseParams
      )
      const avg = toNum(range.avg_price)

      // 2. 报价裁定：与历史均价比较（偏离 >10% 视为偏高/偏低）
      let verdict = null
      const qp = (quote_price !== undefined && quote_price !== '' && quote_price !== null) ? Number(quote_price) : null
      if (qp !== null && Number.isFinite(qp) && avg > 0) {
        const diffPct = Math.round(((qp - avg) / avg) * 100)
        verdict = {
          quote_price: toNum(qp),
          avg_price: avg,
          diff_pct: diffPct,
          level: diffPct > 10 ? 'high' : (diffPct < -10 ? 'low' : 'normal')
        }
      }

      // 3. 相近数量参考（目标数量 ±50%，最少 ±50）+ 按数量校准的裁定
      let similar_quantity = []
      let similar_quantity_stats = null
      let quantity_verdict = null
      if (quantity) {
        const qty = parseInt(quantity, 10)
        if (Number.isFinite(qty) && qty > 0) {
          const tol = Math.max(Math.ceil(qty * 0.5), 50)
          const lo = qty - tol, hi = qty + tol
          similar_quantity = await db.query(
            `SELECT id, product_name, supplier_name, ip, project_name, unit_price, total_quantity, total_price, create_time
             FROM price_record ${base} AND total_quantity BETWEEN ? AND ?
             ORDER BY ABS(total_quantity - ?) ASC LIMIT 10`,
            [...baseParams, lo, hi, qty]
          )
          // 相近数量区间的整体均价（覆盖全部命中记录，不止上面展示的 10 条），
          // 比全品类均价更可比——单价高度依赖数量，拿同数量级的均价裁定更公允。
          const [qstat] = await db.query(
            `SELECT COUNT(*) record_count, AVG(unit_price) avg_price, MIN(unit_price) min_price, MAX(unit_price) max_price
             FROM price_record ${base} AND total_quantity BETWEEN ? AND ?`,
            [...baseParams, lo, hi]
          )
          if (qstat && qstat.record_count > 0) {
            const qAvg = toNum(qstat.avg_price)
            similar_quantity_stats = {
              quantity: qty,
              band: [lo, hi],
              record_count: qstat.record_count,
              avg_price: qAvg,
              min_price: toNum(qstat.min_price),
              max_price: toNum(qstat.max_price)
            }
            if (qp !== null && Number.isFinite(qp) && qAvg > 0) {
              const qDiff = Math.round(((qp - qAvg) / qAvg) * 100)
              quantity_verdict = {
                quote_price: toNum(qp),
                avg_price: qAvg,
                record_count: qstat.record_count,
                diff_pct: qDiff,
                level: qDiff > 10 ? 'high' : (qDiff < -10 ? 'low' : 'normal')
              }
            }
          }
        }
      }

      // 4. 同供应商历史（本品类）
      let same_supplier = null
      if (supplier_name) {
        const [ss] = await db.query(
          `SELECT COUNT(*) record_count, AVG(unit_price) avg_price, MIN(unit_price) min_price, MAX(unit_price) max_price
           FROM price_record ${base} AND supplier_name LIKE ?`,
          [...baseParams, `%${supplier_name}%`]
        )
        if (ss && ss.record_count > 0) {
          same_supplier = {
            supplier_name,
            record_count: ss.record_count,
            avg_price: toNum(ss.avg_price),
            min_price: toNum(ss.min_price),
            max_price: toNum(ss.max_price)
          }
        }
      }

      // 5. 跨供应商对比（本品类，按均价升序）
      const compRows = await db.query(
        `SELECT supplier_name, COUNT(*) record_count, AVG(unit_price) avg_price, MIN(unit_price) min_price, MAX(unit_price) max_price
         FROM price_record ${base} AND supplier_name IS NOT NULL AND supplier_name <> ''
         GROUP BY supplier_name ORDER BY avg_price ASC`,
        baseParams
      )
      const supplier_comparison = compRows.map(s => ({
        supplier_name: s.supplier_name,
        record_count: s.record_count,
        avg_price: toNum(s.avg_price),
        min_price: toNum(s.min_price),
        max_price: toNum(s.max_price)
      }))

      res.json(Response.success({
        range: {
          total_count: range.total_count || 0,
          max_price: toNum(range.max_price),
          min_price: toNum(range.min_price),
          avg_price: avg
        },
        verdict,
        quantity_verdict,
        similar_quantity,
        similar_quantity_stats,
        same_supplier,
        supplier_comparison
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 价格记录筛选选项（去重，供前端下拉使用）
   * GET /api/price-records/options
   */
  async options(req, res, next) {
    try {
      const pick = async (col) => {
        const rows = await db.query(
          `SELECT DISTINCT ${col} as v FROM price_record WHERE is_delete = 0 AND ${col} IS NOT NULL AND ${col} <> '' ORDER BY v`
        )
        return rows.map(r => r.v)
      }
      // 列名为固定常量，无注入风险
      const [categories, suppliers, ips, projects] = await Promise.all([
        pick('category'), pick('supplier_name'), pick('ip'), pick('project_name')
      ])
      res.json(Response.success({ categories, suppliers, ips, projects }))
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

      const consistencyError = checkQuantityConsistency(req.body)
      if (consistencyError) {
        return res.status(400).json(Response.badRequest(consistencyError))
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

      const consistencyError = checkQuantityConsistency(req.body)
      if (consistencyError) {
        return res.status(400).json(Response.badRequest(consistencyError))
      }

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