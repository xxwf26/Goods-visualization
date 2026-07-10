/**
 * 标签关联表写入工具
 * 维护 inspiration_tag / project_tag 关联表，同时双写旧的逗号字段（降低回滚风险）。
 */
const db = require('../config/database')

const FIELD_OF = { ip: 'ip_tag_ids', category: 'category_tag_ids', craft: 'craft_tag_ids', scene: 'scene_tag_ids' }
const REL_OF = {
  inspiration: { table: 'inspiration_tag', col: 'inspiration_id' },
  project: { table: 'project_tag', col: 'project_id' }
}

/**
 * 同步某条记录的标签到关联表 + 旧逗号字段。
 * @param {'inspiration'|'project'} owner
 * @param {number} recordId 记录 id
 * @param {Object} tagMap { ip:[1,2], category:[3], craft:[], scene:[] }，值为 tag_id 数组
 */
async function syncTags(owner, recordId, tagMap) {
  if (!recordId || !REL_OF[owner]) return
  const { table, col } = REL_OF[owner]
  // 1. 关联表：先删后插
  await db.query(`DELETE FROM ${table} WHERE ${col} = ?`, [recordId])
  const rows = []
  for (const [type, ids] of Object.entries(tagMap || {})) {
    for (const tid of (Array.isArray(ids) ? ids : [])) {
      if (tid) rows.push([recordId, type, tid])
    }
  }
  if (rows.length) {
    const ph = rows.map(() => `(?, ?, ?)`).join(', ')
    await db.query(`INSERT IGNORE INTO ${table} (${col}, tag_type, tag_id) VALUES ${ph}`, rows.flat())
  }
  // 2. 双写旧逗号字段
  const sets = []
  const vals = []
  for (const [type, ids] of Object.entries(tagMap || {})) {
    const field = FIELD_OF[type]
    if (!field) continue
    sets.push(`${field} = ?`)
    vals.push((Array.isArray(ids) ? ids : []).filter(Boolean).join(','))
  }
  if (sets.length) {
    vals.push(recordId)
    await db.query(`UPDATE ${owner} SET ${sets.join(', ')}, update_time = NOW() WHERE id = ?`, vals)
  }
}

/**
 * 增量追加标签到关联表（不清除已有，用于 AI 分析等"有则补充"场景）。
 * 旧逗号字段不在此维护（AI 分析的旧字段由调用方 COALESCE 处理）。
 */
async function addTags(owner, recordId, tagMap) {
  if (!recordId || !REL_OF[owner]) return
  const { table, col } = REL_OF[owner]
  const rows = []
  for (const [type, ids] of Object.entries(tagMap || {})) {
    for (const tid of (Array.isArray(ids) ? ids : [])) {
      if (tid) rows.push([recordId, type, tid])
    }
  }
  if (rows.length) {
    const ph = rows.map(() => `(?, ?, ?)`).join(', ')
    await db.query(`INSERT IGNORE INTO ${table} (${col}, tag_type, tag_id) VALUES ${ph}`, rows.flat())
  }
}

module.exports = { syncTags, addTags }
