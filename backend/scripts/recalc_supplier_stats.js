/**
 * 一次性回填供应商统计字段（cooperation_project_count / cooperation_total_amount）
 * 背景：这两个字段一直为空，从未从 project 表聚合。本脚本遍历所有供应商重算，
 * 之后由 ProjectController 的写入点（create/update/delete/restore/purge/import）维护。
 *
 * 用法：
 *   node scripts/recalc_supplier_stats.js --dry   # 预览
 *   node scripts/recalc_supplier_stats.js         # 实跑
 */
require('dotenv').config()
const { query } = require('../src/config/database')

const DRY = process.argv.includes('--dry')

async function main() {
  const suppliers = await query('SELECT id, supplier_name, cooperation_project_count, cooperation_total_amount FROM supplier WHERE is_delete = 0 ORDER BY id')
  console.log(`共 ${suppliers.length} 个供应商${DRY ? '（dry-run）' : ''}\n`)
  let changed = 0
  for (const s of suppliers) {
    const [r] = await query(
      'SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amt FROM project WHERE supplier_id = ? AND is_delete = 0',
      [s.id]
    )
    const oldCnt = Number(s.cooperation_project_count) || 0
    const oldAmt = Number(s.cooperation_total_amount) || 0
    if (r.cnt !== oldCnt || Number(r.amt) !== oldAmt) {
      console.log(`[${s.id}] ${s.supplier_name}: 项目数 ${oldCnt}→${r.cnt}, 金额 ${oldAmt}→${r.amt}`)
      if (!DRY) {
        await query('UPDATE supplier SET cooperation_project_count = ?, cooperation_total_amount = ?, update_time = NOW() WHERE id = ?', [r.cnt, r.amt, s.id])
      }
      changed++
    }
  }
  console.log(`\n完成：${DRY ? '预览' : '更新'} ${changed} 个供应商`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
