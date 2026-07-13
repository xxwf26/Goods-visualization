/**
 * 把 project.ip_tag_ids 旧字段里的 IP 名称统一转成 tag id。
 * 背景：旧数据表单录入存名称("无限暖暖")、导入存 id("3")，口径不一致。
 * 现前端表单改为下拉选标签(存 id)，本脚本把历史名称数据也转成 id，统一口径。
 * 关联表 project_tag 已在更早的迁移中建好（按名称转 id 写入）。
 *
 * 用法：
 *   node scripts/migrate_project_ip_to_id.js --dry   # 预览
 *   node scripts/migrate_project_ip_to_id.js         # 实跑
 */
require('dotenv').config()
const { query } = require('../src/config/database')

const DRY = process.argv.includes('--dry')

async function main() {
  const rows = await query("SELECT id, ip_tag_ids FROM project WHERE is_delete=0 AND ip_tag_ids IS NOT NULL AND ip_tag_ids<>''")
  console.log(`待检查 ${rows.length} 条${DRY ? '（dry-run）' : ''}\n`)
  let changed = 0, skipped = 0
  for (const r of rows) {
    const raw = String(r.ip_tag_ids).trim()
    // 已经是纯数字 id 的，跳过
    if (/^\d+$/.test(raw)) { skipped++; continue }
    // 名称 → id
    const [t] = await query("SELECT id FROM tag WHERE tag_type='ip' AND tag_name=? AND is_delete=0", [raw])
    if (!t) { console.log(`[${r.id}] 未找到标签「${raw}」，跳过`); continue }
    console.log(`[${r.id}] ${raw} → ${t.id}`)
    if (!DRY) {
      await query('UPDATE project SET ip_tag_ids=?, update_time=NOW() WHERE id=?', [String(t.id), r.id])
    }
    changed++
  }
  console.log(`\n完成：转换 ${changed}，已是id跳过 ${skipped}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
