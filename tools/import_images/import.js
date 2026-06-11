/**
 * 效果图批量导入脚本 v2
 * 支持格式：从飞书多维表格导出的 zip 附件包
 * 文件命名：{单品名称}.png / {单品名称}(N).png（重复时）
 * 用法：node import.js <zip文件路径>
 * 示例：node import.js "C:\Users\xxwf\Downloads\xxx_附件.zip"
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const mysql = require('mysql2/promise')
const os = require('os')

// ─── 配置 ────────────────────────────────────────────────────
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,
  database: 'goods_visualization',
  user: 'root',
  password: 'Xie20040520@'
}
const UPLOADS_DIR = path.resolve(__dirname, '../../backend/uploads')
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
// ─────────────────────────────────────────────────────────────

/**
 * 把文件名还原成 product_name：
 *   1. 去掉扩展名
 *   2. 去掉末尾的 (N) 编号，返回 { name, index }
 *   3. 把 _ 可能是 * 的情况先保留原样，查库时再二次匹配
 */
function parseFilename(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (!SUPPORTED_EXTS.includes(ext)) return null

  let base = path.basename(filename, ext)

  // 提取末尾的 (N) 编号
  const indexMatch = base.match(/^(.*)\((\d+)\)$/)
  let index = 0
  if (indexMatch) {
    base = indexMatch[1]
    index = parseInt(indexMatch[2])
  }

  return { rawName: base, index, ext }
}

/**
 * 规范化名称用于比对：把 _ 替换成 * 再比较（飞书把 * 导出为 _）
 * 同时提供原始名称，两个都试一下
 */
function normalizeForMatch(name) {
  return [name, name.replace(/_/g, '*')]
}

async function main() {
  const zipPath = process.argv[2]
  if (!zipPath) {
    console.error('❌ 请指定 zip 文件路径')
    console.error('   用法: node import.js <zip文件路径>')
    process.exit(1)
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`❌ 文件不存在: ${zipPath}`)
    process.exit(1)
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }

  // 解压到临时目录
  const tmpDir = path.join(os.tmpdir(), `feishu_import_${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  console.log(`\n📦 解压中: ${zipPath}`)
  try {
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' })
  } catch (e) {
    console.error('❌ 解压失败:', e.message)
    process.exit(1)
  }

  const files = fs.readdirSync(tmpDir).filter(f => {
    const ext = path.extname(f).toLowerCase()
    return SUPPORTED_EXTS.includes(ext)
  })

  console.log(`📂 共 ${files.length} 张图片，开始匹配数据库...\n`)

  const db = await mysql.createConnection(DB_CONFIG)

  // 一次性把所有 project 按 product_name 分组，记录出现顺序
  const [allProjects] = await db.execute(
    'SELECT id, project_name, product_name, effect_images FROM project ORDER BY id ASC'
  )

  // 建立 product_name → [id, ...] 的有序映射（按 id 升序）
  const nameToIds = {}
  for (const row of allProjects) {
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
    const candidates = normalizeForMatch(rawName)

    // 找到匹配的 product_name 列表
    let matched = null
    for (const candidate of candidates) {
      if (nameToIds[candidate]) {
        matched = nameToIds[candidate]
        break
      }
    }

    if (!matched) {
      results.push({ status: '⚠️ 未匹配', file, reason: `数据库中无 product_name="${rawName}"` })
      skipped++
      continue
    }

    if (index >= matched.length) {
      results.push({ status: '⚠️ 未匹配', file, reason: `"${rawName}" 只有 ${matched.length} 条记录，但文件编号为 (${index})` })
      skipped++
      continue
    }

    const record = matched[index]
    const newFilename = `project_${record.id}_${Date.now()}${ext}`
    const destPath = path.join(UPLOADS_DIR, newFilename)

    try {
      fs.copyFileSync(path.join(tmpDir, file), destPath)
      await db.execute(
        'UPDATE project SET effect_images = ? WHERE id = ?',
        [newFilename, record.id]
      )
      results.push({
        status: '✅ 成功',
        file,
        id: record.id,
        name: `${record.project_name} - ${record.product_name}`,
        saved: newFilename
      })
      success++
    } catch (err) {
      results.push({ status: '❌ 失败', file, reason: err.message })
      failed++
    }
  }

  await db.end()

  // 清理临时目录
  fs.rmSync(tmpDir, { recursive: true, force: true })

  // 打印结果
  console.log('─'.repeat(70))
  for (const r of results) {
    if (r.id) {
      console.log(`${r.status}  [id=${r.id}] ${r.name}`)
      console.log(`         ${r.file} → ${r.saved}`)
    } else {
      console.log(`${r.status}  ${r.file}`)
      if (r.reason) console.log(`         原因: ${r.reason}`)
    }
  }

  console.log('─'.repeat(70))
  console.log(`\n✅ 成功: ${success}  ⚠️ 跳过: ${skipped}  ❌ 失败: ${failed}\n`)
}

main().catch(err => {
  console.error('脚本运行出错:', err.message)
  process.exit(1)
})
