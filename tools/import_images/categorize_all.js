/**
 * 批量 AI 分类：对所有灵感按内容打上 4 分类标签（可多类）
 * 用法: node categorize_all.js
 */
require('../../backend/node_modules/dotenv').config({ path: '../../backend/.env' })
const db = require('../../backend/src/config/database')
const AiAnalyzer = require('../../backend/src/services/AiAnalyzer')

async function main() {
  const rows = await db.query("SELECT id, title, description, content_summary, image_texts FROM inspiration WHERE is_delete=0 ORDER BY id")
  console.log(`共 ${rows.length} 条灵感，开始 AI 分类...\n`)

  let ok = 0, fail = 0
  for (const r of rows) {
    // 拼接内容
    let content = r.title || ''
    if (r.description) content += '\n' + r.description
    if (r.content_summary) content += '\n' + r.content_summary
    // 从 image_texts 提取 OCR 文字
    if (r.image_texts) {
      try {
        const arr = JSON.parse(r.image_texts)
        if (Array.isArray(arr)) {
          const ocr = arr.map(x => x.text).filter(Boolean).join('\n')
          if (ocr) content += '\n' + ocr
        }
      } catch {}
    }

    if (!content.trim()) {
      console.log(`[id=${r.id}] 无内容，跳过`)
      fail++
      continue
    }

    try {
      const cats = await AiAnalyzer.categorize(content)
      if (cats.length === 0) {
        console.log(`[id=${r.id}] AI 未分类，跳过`)
        fail++
        continue
      }
      const catsStr = cats.join(',')
      await db.query('UPDATE inspiration SET categories = ?, inspiration_type = ? WHERE id = ?', [catsStr, cats[0], r.id])
      console.log(`[id=${r.id}] ${r.title?.substring(0,20)} → ${catsStr}`)
      ok++
    } catch (e) {
      console.log(`[id=${r.id}] 失败: ${e.message}`)
      fail++
    }
  }

  console.log(`\n──────────────`)
  console.log(`✅ 成功: ${ok}  ❌ 失败: ${fail}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
