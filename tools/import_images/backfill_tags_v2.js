/**
 * 批量回填标签 v2：重新抓取帖子原始标签 + 直接名称匹配 + AI补充
 * 优先用帖子tag直接匹配IP，比纯AI猜测准确得多
 */
require('../../backend/node_modules/dotenv').config({ path: '../../backend/.env' })
const db = require('../../backend/src/config/database')
const MetaFetcher = require('../../backend/src/services/MetaFetcher')
const AiAnalyzer = require('../../backend/src/services/AiAnalyzer')

async function main() {
  // 加载标签库
  const tags = await db.query('SELECT id, tag_name, tag_type FROM tag WHERE is_delete=0 AND status=1')
  const tagsByType = { ip: [], category: [], craft: [], scene: [] }
  for (const t of tags) { if (tagsByType[t.tag_type]) tagsByType[t.tag_type].push({ id: t.id, name: t.tag_name }) }
  console.log(`标签库: IP ${tagsByType.ip.length} 品类 ${tagsByType.category.length} 工艺 ${tagsByType.craft.length} 场景 ${tagsByType.scene.length}`)
  console.log(`IP标签: ${tagsByType.ip.map(t=>t.name).join(', ')}\n`)

  // 获取所有灵感
  const rows = await db.query('SELECT id, title, link, source_url, description, content_summary, image_texts, post_tags FROM inspiration WHERE is_delete=0 ORDER BY id')
  console.log(`共 ${rows.length} 条灵感\n`)

  let ok = 0, fail = 0, skip = 0
  for (const r of rows) {
    const url = r.link || r.source_url
    let postTags = []

    // 1. 如果已有 post_tags，直接用；否则重新抓取
    if (r.post_tags) {
      postTags = r.post_tags.split(',').map(s => s.trim()).filter(Boolean)
    } else if (url) {
      try {
        const meta = await MetaFetcher.fetch(url)
        if (meta.tags?.length) {
          postTags = meta.tags
          await db.query('UPDATE inspiration SET post_tags = ? WHERE id = ?', [postTags.join(','), r.id])
        }
      } catch (e) { /* 链接可能已失效 */ }
    }

    // 2. 直接匹配帖子标签到标签库
    const directMatched = { ip: new Set(), category: new Set(), craft: new Set(), scene: new Set() }
    for (const pt of postTags) {
      for (const [type, list] of Object.entries(tagsByType)) {
        const found = list.find(t => t.name === pt || pt.includes(t.name) || t.name.includes(pt))
        if (found) directMatched[type].add(found.id)
      }
    }

    // 3. AI 提取补充（对直接匹配没覆盖的类型）
    let aiTagIds = { ip: [], category: [], craft: [], scene: [] }
    let referenceValue = ''
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
    if (postTags.length) content += '\n帖子标签: ' + postTags.join('、')

    if (content.trim().length >= 5) {
      try {
        const meta = await AiAnalyzer.extractMeta(content, tagsByType)
        aiTagIds = meta.tagIds
        referenceValue = meta.reference_value
      } catch (e) { /* AI失败不影响直接匹配 */ }
    }

    // 4. 合并：直接匹配优先 + AI补充
    const merged = {}
    for (const type of ['ip', 'category', 'craft', 'scene']) {
      merged[type] = [...new Set([...(directMatched[type] || []), ...(aiTagIds[type] || [])])]
    }

    // 5. 写入数据库（只更新有值的字段，不覆盖已有值）
    const updates = []
    const params = []
    if (merged.ip.length) { updates.push('ip_tag_ids = COALESCE(NULLIF(ip_tag_ids,""), ?)'); params.push(merged.ip.join(',')) }
    if (merged.category.length) { updates.push('category_tag_ids = COALESCE(NULLIF(category_tag_ids,""), ?)'); params.push(merged.category.join(',')) }
    if (merged.craft.length) { updates.push('craft_tag_ids = COALESCE(NULLIF(craft_tag_ids,""), ?)'); params.push(merged.craft.join(',')) }
    if (merged.scene.length) { updates.push('scene_tag_ids = COALESCE(NULLIF(scene_tag_ids,""), ?)'); params.push(merged.scene.join(',')) }
    if (referenceValue) { updates.push('reference_value = COALESCE(NULLIF(reference_value,""), ?)'); params.push(referenceValue) }

    if (updates.length > 0) {
      params.push(r.id)
      await db.query(`UPDATE inspiration SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`, params)
      const summary = [
        merged.ip.length ? `IP:${merged.ip.length}` : '',
        merged.category.length ? `品类:${merged.category.length}` : '',
        merged.craft.length ? `工艺:${merged.craft.length}` : '',
        merged.scene.length ? `场景:${merged.scene.length}` : '',
        postTags.length ? `帖tag:${postTags.length}` : ''
      ].filter(Boolean).join(' ')
      console.log(`✅ [id=${r.id}] ${r.title?.substring(0,18)} → ${summary}`)
      ok++
    } else {
      console.log(`⚠️  [id=${r.id}] ${r.title?.substring(0,18)} → 无匹配`)
      skip++
    }
  }

  console.log(`\n──────────────`)
  console.log(`✅ 成功: ${ok}  ⚠️ 跳过: ${skip}  ❌ 失败: ${fail}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
