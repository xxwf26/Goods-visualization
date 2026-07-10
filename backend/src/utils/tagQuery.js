/**
 * 标签关联表查询工具
 * 替代旧的 LIKE '%id%' / FIND_IN_SET(id, '逗号串') 查询，避免 LIKE 误匹配（查1命中10）。
 */
const db = require('../config/database')

const REL_OF = {
  inspiration: { table: 'inspiration_tag', col: 'inspiration_id' },
  project: { table: 'project_tag', col: 'project_id' }
}

/**
 * 生成 EXISTS 子查询片段，用于 WHERE 中按标签筛选。
 * @param {'inspiration'|'project'} owner
 * @param {string} alias 主表别名（如 'i'、'p'）
 * @param {string} type ip/category/craft/scene
 * @param {string} placeholder 占位（通常 '?'，参数由调用方 push）
 * @returns {string} SQL 片段
 */
function tagExistsClause(owner, alias, type) {
  const { table, col } = REL_OF[owner]
  return `EXISTS(SELECT 1 FROM ${table} WHERE ${col} = ${alias}.id AND tag_type = '${type}' AND tag_id = ?)`
}

/**
 * 查某条记录的各类标签 id 映射 { ip:[], category:[], craft:[], scene:[] }。
 */
async function getTagsByRecord(owner, recordId) {
  const { table, col } = REL_OF[owner]
  const rows = await db.query(`SELECT tag_type, tag_id FROM ${table} WHERE ${col} = ?`, [recordId])
  const m = { ip: [], category: [], craft: [], scene: [] }
  for (const r of rows) { if (m[r.tag_type]) m[r.tag_type].push(r.tag_id) }
  return m
}

/**
 * 批量查多条记录的标签名（用于列表展示 tag_names）。
 * 返回 { recordId: { ip:'名称,名称', category:'...', ... } }
 */
async function getTagNamesBatch(owner, ids) {
  if (!ids || !ids.length) return {}
  const { table, col } = REL_OF[owner]
  const ph = ids.map(() => '?').join(',')
  const rows = await db.query(
    `SELECT r.${col} as rid, r.tag_type, t.tag_name
     FROM ${table} r LEFT JOIN tag t ON r.tag_id = t.id AND t.is_delete = 0
     WHERE r.${col} IN (${ph})`,
    ids
  )
  const m = {}
  for (const r of rows) {
    if (!m[r.rid]) m[r.rid] = { ip: [], category: [], craft: [], scene: [] }
    if (m[r.rid][r.tag_type] && r.tag_name) m[r.rid][r.tag_type].push(r.tag_name)
  }
  const out = {}
  for (const [rid, types] of Object.entries(m)) {
    out[rid] = {
      ip_tag_names: types.ip.join(','),
      category_tag_names: types.category.join(','),
      craft_tag_names: types.craft.join(','),
      scene_tag_names: types.scene.join(',')
    }
  }
  return out
}

module.exports = { tagExistsClause, getTagsByRecord, getTagNamesBatch, REL_OF }
