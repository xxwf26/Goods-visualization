/**
 * 一次性回填：对所有现有灵感链接重新抓取元数据，只补空字段
 */
const mysql = require('mysql2/promise')
const MetaFetcher = require('../../backend/src/services/MetaFetcher')

const DB = {
  host: '127.0.0.1', port: 3307,
  database: 'goods_visualization',
  user: 'root', password: 'Xie20040520@'
}

async function main() {
  const db = await mysql.createConnection(DB)
  const [rows] = await db.execute(
    'SELECT id, link, source_url, description, cover_image, source_platform FROM inspiration WHERE is_delete=0 ORDER BY id'
  )

  console.log(`共 ${rows.length} 条灵感，开始回填...\n`)
  let filled = 0, failed = 0

  for (const r of rows) {
    const url = r.link || r.source_url
    if (!url || !url.startsWith('http')) {
      console.log(`[id=${r.id}] 无有效链接，跳过`)
      failed++
      continue
    }

    let meta
    try { meta = await MetaFetcher.fetch(url) } catch (e) {
      console.log(`[id=${r.id}] ❌ 抓取失败: ${e.message}  (${url.substring(0,40)})`)
      failed++
      continue
    }

    const updates = []
    const params = []
    if (!r.description && meta.description) { updates.push('description = ?'); params.push(meta.description.substring(0,1000)) }
    if (!r.cover_image && meta.image) { updates.push('cover_image = ?'); params.push(meta.image) }
    if (!r.source_platform && meta.platform) { updates.push('source_platform = ?'); params.push(meta.platform) }

    if (updates.length > 0) {
      params.push(r.id)
      await db.execute(`UPDATE inspiration SET ${updates.join(', ')}, update_time=NOW() WHERE id=?`, params)
      console.log(`[id=${r.id}] ✅ 补全 ${updates.length} 项: ${meta.platform} | ${meta.title?.substring(0,20)||''}`)
      filled++
    } else {
      console.log(`[id=${r.id}] ⚠️ 抓到内容但无空字段可补 (平台:${meta.platform||'无'})`)
    }
  }

  await db.end()
  console.log(`\n──────────────────────────`)
  console.log(`✅ 成功补全: ${filled} 条`)
  console.log(`❌ 抓取失败: ${failed} 条`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
