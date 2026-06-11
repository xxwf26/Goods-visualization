/**
 * 历史项目库报价单图片批量导入 v2（支持多图）
 * 规则：
 *   - 文件名 rawName(N).ext
 *   - 若数据库有 N+1 条同名记录 → 文件属于第 N 条记录
 *   - 若数据库只有 1 条同名记录（或 N >= 记录数）→ 文件作为同一条记录的第 N+1 张图
 *   - 同一 (rawName, index) 下有多个扩展名 → 均属同一记录，逗号拼接存储
 * 用法: node import_project_images.js <zip路径>
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const mysql = require('mysql2/promise')
const os = require('os')

const DB_CONFIG = {
  host: '127.0.0.1', port: 3307,
  database: 'goods_visualization',
  user: 'root', password: 'Xie20040520@'
}
const UPLOADS_DIR = path.resolve(__dirname, '../../backend/uploads')
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

function parseFilename(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (!SUPPORTED_EXTS.includes(ext)) return null
  let base = path.basename(filename, ext)
  const m = base.match(/^(.*)\((\d+)\)$/)
  let index = 0
  if (m) { base = m[1]; index = parseInt(m[2]) }
  return { rawName: base, index, ext, original: filename }
}

function normalizeName(name) {
  // 还原飞书导出时的字符替换：_ → * 或 _ → .
  return [name, name.replace(/_/g, '*'), name.replace(/_/g, '.')]
}

async function main() {
  const zipPath = process.argv[2]
  if (!zipPath || !fs.existsSync(zipPath)) {
    console.error('❌ 请指定有效的 zip 文件路径')
    process.exit(1)
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  const tmpDir = path.join(os.tmpdir(), `proj_img2_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  console.log(`\n📦 解压: ${zipPath}`)
  execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' })

  const allFiles = fs.readdirSync(tmpDir)
    .map(f => parseFilename(f))
    .filter(Boolean)

  console.log(`📂 共 ${allFiles.length} 张图片，开始分析匹配...\n`)

  const db = await mysql.createConnection(DB_CONFIG)

  // 按 product_name 分组，id 升序
  const [allRecords] = await db.execute(
    'SELECT id, product_name FROM project ORDER BY id ASC'
  )
  const nameToIds = {}
  for (const row of allRecords) {
    const key = (row.product_name || '').trim()
    if (!nameToIds[key]) nameToIds[key] = []
    nameToIds[key].push(row)
  }

  // 第一步：把所有文件按 (matchedRecordId) 分组，同一记录的多张图放在一起
  // map: recordId → [filename, ...]
  const recordImages = {}  // recordId → Set of dest filenames

  let unmatched = 0

  // 先按 rawName 分组所有文件
  const filesByRawName = {}
  for (const f of allFiles) {
    const key = f.rawName
    if (!filesByRawName[key]) filesByRawName[key] = []
    filesByRawName[key].push(f)
  }

  for (const [rawName, files] of Object.entries(filesByRawName)) {
    // 找到匹配的 DB 记录
    let records = null
    for (const candidate of normalizeName(rawName)) {
      if (nameToIds[candidate]) { records = nameToIds[candidate]; break }
    }

    if (!records) {
      console.log(`⚠️  未匹配: "${rawName}" (${files.length} 张)`)
      unmatched += files.length
      continue
    }

    // 按 index 分组文件
    const byIndex = {}
    for (const f of files) {
      if (!byIndex[f.index]) byIndex[f.index] = []
      byIndex[f.index].push(f)
    }

    for (const [idxStr, imgs] of Object.entries(byIndex)) {
      const idx = parseInt(idxStr)

      // 判断归属记录
      let targetRecord
      if (idx < records.length) {
        // index 对应第 idx 条同名记录
        targetRecord = records[idx]
      } else if (records.length === 1) {
        // 只有 1 条记录，(N) 表示同一记录的第 N+1 张图
        targetRecord = records[0]
      } else {
        // 多条记录但 index 超出范围
        console.log(`⚠️  编号越界: "${rawName}(${idx})" (共 ${records.length} 条记录)`)
        unmatched += imgs.length
        continue
      }

      if (!recordImages[targetRecord.id]) recordImages[targetRecord.id] = []
      recordImages[targetRecord.id].push(...imgs)
    }
  }

  // 第二步：清空所有 quotation_file，重新写入
  await db.execute('UPDATE project SET quotation_file = NULL WHERE 1=1')
  console.log('🗑️  已清空旧 quotation_file，开始写入...\n')

  let success = 0, failed = 0

  for (const [recordId, imgs] of Object.entries(recordImages)) {
    const savedFiles = []

    for (const img of imgs) {
      const newFilename = `quotation_${recordId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}${img.ext}`
      const destPath = path.join(UPLOADS_DIR, newFilename)
      try {
        fs.copyFileSync(path.join(tmpDir, img.original), destPath)
        savedFiles.push(newFilename)
      } catch (e) {
        console.error(`  ❌ 复制失败: ${img.original} → ${e.message}`)
        failed++
      }
    }

    if (savedFiles.length > 0) {
      const record = allRecords.find(r => r.id === parseInt(recordId))
      await db.execute(
        'UPDATE project SET quotation_file = ? WHERE id = ?',
        [savedFiles.join(','), recordId]
      )
      console.log(`✅  [id=${recordId}] ${record?.product_name}`)
      console.log(`     ${savedFiles.length} 张: ${savedFiles.join(', ')}`)
      success++
    }
  }

  await db.end()
  fs.rmSync(tmpDir, { recursive: true, force: true })

  console.log('\n' + '─'.repeat(65))
  console.log(`✅ 成功更新: ${success} 条记录  ❌ 失败: ${failed}  ⚠️ 未匹配: ${unmatched} 张`)
  console.log('─'.repeat(65) + '\n')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
