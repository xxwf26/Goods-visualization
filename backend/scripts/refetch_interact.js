/**
 * 回填历史灵感的点赞/收藏数
 * 背景：旧版 MetaFetcher 用 parseInt 解析小红书互动数，把 "1.1万" 截成 1，导致 like_count 严重失真。
 * 本脚本对带小红书链接的灵感重新抓取 interactInfo，用修正后的 parseCount 还原真实整数，
 * 只更新 like_count / save_count 两个字段，不动其它快照内容。
 *
 * 用法：
 *   node scripts/refetch_interact.js          # 全量回填（带链接的小红书灵感）
 *   node scripts/refetch_interact.js --dry     # 只打印将要变更，不写库
 *   node scripts/refetch_interact.js --id 57   # 只处理指定 id
 */
require('dotenv').config()
const { query } = require('../src/config/database')
const MetaFetcher = require('../src/services/MetaFetcher')

const DRY = process.argv.includes('--dry')
const idArg = (() => {
  const i = process.argv.indexOf('--id')
  return i >= 0 ? Number(process.argv[i + 1]) : null
})()

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  let sql = `SELECT id, title, COALESCE(link, source_url) AS url, like_count, save_count
             FROM inspiration
             WHERE is_delete = 0
               AND (link LIKE '%xiaohongshu%' OR source_url LIKE '%xiaohongshu%'
                    OR link LIKE '%xhslink%' OR source_url LIKE '%xhslink%')`
  const params = []
  if (idArg) { sql += ' AND id = ?'; params.push(idArg) }
  sql += ' ORDER BY id DESC'

  const rows = await query(sql, params)
  console.log(`共 ${rows.length} 条待检查${DRY ? '（dry-run，不写库）' : ''}\n`)

  let changed = 0, failed = 0, skipped = 0
  for (const r of rows) {
    if (!r.url || !r.url.startsWith('http')) { skipped++; continue }
    let meta
    try {
      meta = await MetaFetcher.fetch(r.url)
    } catch (e) {
      console.log(`[${r.id}] 抓取失败：${e.message}  «${r.title}»`)
      failed++
      await sleep(1500)
      continue
    }
    // 抓不到互动数据（笔记私密/失效/被限流）→ 保留原值，不清零
    if (!meta || (!meta.likeCount && !meta.saveCount)) {
      console.log(`[${r.id}] 未拿到互动数据，跳过  «${r.title}»`)
      skipped++
      await sleep(1500)
      continue
    }
    const newLike = meta.likeCount || 0
    const newSave = meta.saveCount || 0
    if (newLike === r.like_count && newSave === r.save_count) {
      console.log(`[${r.id}] 无变化 (赞${newLike}/藏${newSave})  «${r.title}»`)
      await sleep(1200)
      continue
    }
    console.log(`[${r.id}] 赞 ${r.like_count}→${newLike}  藏 ${r.save_count}→${newSave}  «${r.title}»`)
    if (!DRY) {
      await query('UPDATE inspiration SET like_count = ?, save_count = ? WHERE id = ?', [newLike, newSave, r.id])
    }
    changed++
    await sleep(1500) // 限速，避免触发风控
  }

  console.log(`\n完成：变更 ${changed}，失败 ${failed}，跳过 ${skipped}${DRY ? '（未写库）' : ''}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
