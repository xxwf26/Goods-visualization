/**
 * 把 inspiration/project 的逗号字符串 _tag_ids 迁移到关联表
 * 旧字段保留（双写），本脚本只做一次性历史数据迁移。
 *
 * 用法：
 *   node scripts/migrate_tag_relation.js --dry   # 预览
 *   node scripts/migrate_tag_relation.js         # 实跑
 */
require('dotenv').config()
const { query } = require('../src/config/database')

const DRY = process.argv.includes('--dry')

// 字段名 → tag_type 映射
const FIELDS = {
  ip_tag_ids: 'ip',
  category_tag_ids: 'category',
  craft_tag_ids: 'craft',
  scene_tag_ids: 'scene'
}

// 解析一个字段的值为 tag_id 数组。
// valueMode: 'id' 直接是数字 id；'name' 是名称，需查 tag 表转 id。
async function resolveIds(raw, type, valueMode, nameCache) {
  const tokens = String(raw).split(',').map(s => s.trim()).filter(Boolean)
  if (valueMode === 'id') return tokens.map(Number).filter(n => !isNaN(n))
  // name 模式：查 tag 表
  const ids = []
  for (const name of tokens) {
    if (nameCache.has(name)) { if (nameCache.get(name)) ids.push(nameCache.get(name)); continue }
    const [t] = await query('SELECT id FROM tag WHERE tag_type=? AND tag_name=? AND is_delete=0', [type, name])
    nameCache.set(name, t ? t.id : null)
    if (t) ids.push(t.id)
  }
  return ids
}

async function migrateTable(table, relTable, relCol, valueMode) {
  const rows = await query(`SELECT id, ip_tag_ids, category_tag_ids, craft_tag_ids, scene_tag_ids FROM ${table} WHERE is_delete = 0`)
  const nameCache = new Map()
  let total = 0
  for (const r of rows) {
    for (const [field, type] of Object.entries(FIELDS)) {
      const raw = r[field]
      if (!raw) continue
      const ids = await resolveIds(raw, type, valueMode, nameCache)
      for (const tid of ids) {
        total++
        if (!DRY) {
          try {
            await query(`INSERT IGNORE INTO ${relTable} (${relCol}, tag_type, tag_id) VALUES (?, ?, ?)`, [r.id, type, tid])
          } catch (e) { /* 重复键等忽略 */ }
        }
      }
    }
  }
  return { rows: rows.length, relRows: total }
}

async function main() {
  // inspiration 存的是 tag ID；project 的 ip_tag_ids 存的是 IP 名称（需查表转换）
  const insp = await migrateTable('inspiration', 'inspiration_tag', 'inspiration_id', 'id')
  console.log(`inspiration: ${insp.rows} 条记录 → ${insp.relRows} 条关联行${DRY ? '（dry-run）' : ''}`)
  const proj = await migrateTable('project', 'project_tag', 'project_id', 'name')
  console.log(`project: ${proj.rows} 条记录 → ${proj.relRows} 条关联行${DRY ? '（dry-run）' : ''}`)

  if (!DRY) {
    const [i] = await query('SELECT COUNT(*) n FROM inspiration_tag')
    const [p] = await query('SELECT COUNT(*) n FROM project_tag')
    console.log(`\n关联表实际行数：inspiration_tag=${i.n}, project_tag=${p.n}`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
