/**
 * 历史项目库报价单图片批量导入
 * zip 文件名 = project.product_name（文本列）
 * 匹配后写入 quotation_file 字段
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
  return { rawName: base, index, ext }
}

function normalizeForMatch(name) {
  return [
    name,
    name.replace(/_/g, '*'),
    name.replace(/_/g, '.'),
    name.replace(/_/g, '*').replace(/_/g, '.'),
  ]
}

async function main() {
  const zipPath = process.argv[2]
  if (!zipPath || !fs.existsSync(zipPath)) {
    console.error('❌ 请指定有效的 zip 文件路径')
    process.exit(1)
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  const tmpDir = path.join(os.tmpdir(), `proj_img_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  console.log(`\n📦 解压: ${zipPath}`)
  execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' })

  const files = fs.readdirSync(tmpDir).filter(f => SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()))
  console.log(`📂 共 ${files.length} 张图片，匹配 project.product_name...\n`)

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

  let success = 0, skipped = 0, failed = 0
  const results = []

  for (const file of files) {
    const parsed = parseFilename(file)
    if (!parsed) { skipped++; continue }

    const { rawName, index, ext } = parsed
    let matched = null
    for (const candidate of normalizeForMatch(rawName)) {
      if (nameToIds[candidate]) { matched = nameToIds[candidate]; break }
    }

    if (!matched) {
      results.push({ status: '⚠️ 未匹配', file, reason: `project 中无 product_name="${rawName}"` })
      skipped++; continue
    }
    if (index >= matched.length) {
      results.push({ status: '⚠️ 编号越界', file, reason: `"${rawName}" 只有 ${matched.length} 条，编号 (${index})` })
      skipped++; continue
    }

    const record = matched[index]
    const newFilename = `quotation_${record.id}_${Date.now()}${ext}`
    const destPath = path.join(UPLOADS_DIR, newFilename)

    try {
      fs.copyFileSync(path.join(tmpDir, file), destPath)
      await db.execute('UPDATE project SET quotation_file = ? WHERE id = ?', [newFilename, record.id])
      results.push({ status: '✅', file, id: record.id, name: record.product_name, saved: newFilename })
      success++
    } catch (e) {
      results.push({ status: '❌', file, reason: e.message })
      failed++
    }
  }

  await db.end()
  fs.rmSync(tmpDir, { recursive: true, force: true })

  console.log('─'.repeat(65))
  for (const r of results) {
    if (r.id) {
      console.log(`${r.status}  [id=${r.id}] ${r.name}`)
    } else {
      console.log(`${r.status}  ${r.file}  ${r.reason || ''}`)
    }
  }
  console.log('─'.repeat(65))
  console.log(`\n✅ 成功: ${success}  ⚠️ 跳过: ${skipped}  ❌ 失败: ${failed}\n`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
