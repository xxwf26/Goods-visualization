/**
 * 把冗余字段 collect_count 的收藏数迁移到 save_count
 * 背景：collect_count 全代码库零引用，但有历史数据只存在该字段（save_count=0），
 * 直接废弃会丢收藏数。本脚本对 collect_count>0 且 save_count 为空的记录做迁移。
 * 迁移后 collect_count 保留空列、事实废弃（不再读写）。
 *
 * 用法：
 *   node scripts/merge_collect_count.js --dry   # 预览
 *   node scripts/merge_collect_count.js         # 实跑
 */
require('dotenv').config()
const { query } = require('../src/config/database')

const DRY = process.argv.includes('--dry')

async function main() {
  const rows = await query(
    `SELECT id, title, collect_count, save_count
     FROM inspiration
     WHERE collect_count > 0 AND (save_count = 0 OR save_count IS NULL)`
  )
  console.log(`待迁移 ${rows.length} 条${DRY ? '（dry-run，不写库）' : ''}\n`)
  for (const r of rows) {
    console.log(`[${r.id}] save_count ${r.save_count} → ${r.collect_count}  «${r.title}»`)
    if (!DRY) {
      await query('UPDATE inspiration SET save_count = collect_count WHERE id = ?', [r.id])
    }
  }
  console.log(`\n完成：${DRY ? '预览' : '已迁移'} ${rows.length} 条`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
