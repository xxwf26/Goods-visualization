/**
 * 批量回填：对所有有内容但IP/品类/工艺/场景标签为空的灵感重新提取标签
 */
require('../../backend/node_modules/dotenv').config({ path: '../../backend/.env' })
const db = require('../../backend/src/config/database')
const AiAnalyzer = require('../../backend/src/services/AiAnalyzer')

async function main() {
  // 加载标签库
  const tags = await db.query('SELECT id, tag_name, tag_type FROM tag WHERE is_delete=0 AND status=1')
  const tagsByType = { ip: [], category: [], craft: [], scene: [] }
  for (const t of tags) { if (tagsByType[t.tag_type]) tagsByType[t.tag_type].push({ id: t.id, name: t.tag_name }) }
  console.log(`标签库: IP ${tagsByType.ip.length} 品类 ${tagsByType.category.length} 工艺 ${tagsByType.craft.length} 场景 ${tagsByType.scene.length}`)

  // 找出有内容但4个标签都为空的灵感
  const rows = await db.query(`
    SELECT id, title, description, content_summary, image_texts
    FROM inspiration
    WHERE is_delete = 0
      AND (ip_tag_ids IS NULL OR ip_tag_ids = '')
      AND (category_tag_ids IS NULL OR category_tag_ids = '')
      AND (craft_tag_ids IS NULL OR craft_tag_ids = '')
      AND (scene_tag_ids IS NULL OR scene_tag_ids = '')
    ORDER BY id
  `)
  console.log(`\n需补标签: ${rows.length} 条\n`)

  let ok = 0, fail = 0, skip = 0
  for (const r of rows) {
    // 拼接内容
    let content = r.title || ''
    if (r.description) content += '\n' + r.description
    if (r.content_summary) content += '\n' + r.content_summary
    if (r.image_texts) {
      try {
        const arr = JSON.parse(r.image_texts)
        if (Array.isArray(arr)) {
          const ocr = arr.map(x => x.text).filter(Boolean).join('\n')
          if (ocr) content += '\n' + ocr
        }
      } catch {}
    }

    if (content.trim().length < 5) { console.log(`[id=${r.id}] 内容太少，跳过`); skip++; continue }

    try {
      const meta = await AiAnalyzer.extractMeta(content, tagsByType)
      const updates = []
      const params = []
      if (meta.reference_value) { updates.push('reference_value = ?'); params.push(meta.reference_value) }
      if (meta.tagIds.ip?.length) { updates.push('ip_tag_ids = ?'); params.push(meta.tagIds.ip.join(',')) }
      if (meta.tagIds.category?.length) { updates.push('category_tag_ids = ?'); params.push(meta.tagIds.category.join(',')) }
      if (meta.tagIds.craft?.length) { updates.push('craft_tag_ids = ?'); params.push(meta.tagIds.craft.join(',')) }
      if (meta.tagIds.scene?.length) { updates.push('scene_tag_ids = ?'); params.push(meta.tagIds.scene.join(',')) }

      if (updates.length > 0) {
        params.push(r.id)
        await db.query(`UPDATE inspiration SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`, params)
        const tags = [
          meta.tagIds.ip?.length ? `IP:${meta.tagIds.ip.length}` : '',
          meta.tagIds.category?.length ? `品类:${meta.tagIds.category.length}` : '',
          meta.tagIds.craft?.length ? `工艺:${meta.tagIds.craft.length}` : '',
          meta.tagIds.scene?.length ? `场景:${meta.tagIds.scene.length}` : '',
        ].filter(Boolean).join(' ')
        console.log(`[id=${r.id}] ${r.title?.substring(0, 20)} → ${tags}`)
        ok++
      } else {
        console.log(`[id=${r.id}] ${r.title?.substring(0, 20)} → 无匹配标签`)
        skip++
      }
    } catch (e) {
      console.log(`[id=${r.id}] 失败: ${e.message}`)
      fail++
    }
  }

  console.log(`\n──────────────`)
  console.log(`✅ 成功: ${ok}  ⚠️ 跳过: ${skip}  ❌ 失败: ${fail}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
