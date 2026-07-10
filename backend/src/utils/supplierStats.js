/**
 * 供应商统计字段聚合工具
 * 从 project 表实时聚合「合作项目数 / 合作总金额」回写到 supplier 表，
 * 供首页排行、供应商看板、列表展示使用。采用写入时更新：project 增删改时触发重算。
 */
const db = require('../config/database')

/**
 * 重算单个供应商的合作项目数与总金额。
 * @param {number|string|null} supplierId 供应商 id；为空则跳过
 */
async function recalcSupplierStats(supplierId) {
  if (!supplierId) return
  const [r] = await db.query(
    'SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amt FROM project WHERE supplier_id = ? AND is_delete = 0',
    [supplierId]
  )
  await db.query(
    'UPDATE supplier SET cooperation_project_count = ?, cooperation_total_amount = ?, update_time = NOW() WHERE id = ?',
    [r.cnt || 0, r.amt || 0, supplierId]
  )
}

/**
 * 批量重算多个供应商（如 project 换供应商时新旧两边都要更新）。
 * @param {Array} ids 供应商 id 数组（去重、去空）
 */
async function recalcSuppliersStats(ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))]
  for (const id of uniq) {
    try { await recalcSupplierStats(id) } catch { /* 单个失败不影响其它 */ }
  }
}

module.exports = { recalcSupplierStats, recalcSuppliersStats }
