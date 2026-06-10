/**
 * 飞书导出数据自动导入脚本
 * 读取 2025.4-2026.4周边制作汇总.xlsx 三张表并导入系统
 */
const XLSX = require('xlsx')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const db = require('../src/config/database')

// Excel 日期序列号转 YYYY-MM-DD
function excelDateToISO(serial) {
  if (!serial) return null
  if (typeof serial === 'string') {
    const d = new Date(serial)
    if (!isNaN(d.getTime())) return serial.split('T')[0]
    return null
  }
  const utc = new Date(Date.UTC(0, 0, serial - 1))
  return utc.toISOString().split('T')[0]
}

// 安全数字
function num(val) { return val ? Number(val) : null }

// 获取或创建供应商（按全名+简写匹配）
async function getOrCreateSupplier(name, shortName) {
  if (!name) return null
  // 先全名精确匹配
  const existing = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [name])
  if (existing.length > 0) return existing[0].id
  // 再按简写匹配
  if (shortName) {
    const byShort = await db.query('SELECT id FROM supplier WHERE supplier_short_name = ? AND is_delete = 0', [shortName])
    if (byShort.length > 0) return byShort[0].id
  }
  // 按名称模糊匹配
  const fuzzy = await db.query('SELECT id FROM supplier WHERE supplier_name LIKE ? AND is_delete = 0', ['%' + name.substring(0, 2) + '%'])
  if (fuzzy.length > 0) return fuzzy[0].id

  const result = await db.query(
    `INSERT INTO supplier (supplier_name, supplier_short_name, cooperation_status, create_time, update_time, is_delete)
     VALUES (?, ?, 'active', NOW(), NOW(), 0)`,
    [name, shortName || name]
  )
  return result.insertId
}

// 供应商简写→全名映射（从供应商库 Sheet 加载）
let supplierNameMap = {}
function loadSupplierMap() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const ws = wb.Sheets['供应商库']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  rows.forEach(r => {
    if (r['简写'] && r['供应商']) {
      supplierNameMap[r['简写']] = r['供应商']
    }
  })
  console.log(`  供应商映射: ${Object.keys(supplierNameMap).length} 条 (简写→全名)`)
}

// 解析供应商名（简写自动转换为全名）
function resolveSupplier(name) {
  if (!name) return { fullName: null, shortName: null }
  const trimmed = name.trim()
  // 如果已经是全名，直接用
  if (supplierNameMap[trimmed]) {
    return { fullName: supplierNameMap[trimmed], shortName: trimmed }
  }
  return { fullName: trimmed, shortName: null }
}

// 获取或创建标签
async function getOrCreateTag(name, type) {
  if (!name) return null
  // 先精确匹配
  const existing = await db.query(
    'SELECT id FROM tag WHERE tag_name = ? AND tag_type = ? AND is_delete = 0',
    [name, type]
  )
  if (existing.length > 0) return existing[0].id

  // 模糊匹配（处理品类名称变体）
  const fuzzy = await db.query(
    'SELECT id FROM tag WHERE tag_name LIKE ? AND tag_type = ? AND is_delete = 0',
    ['%' + name.substring(0, 2) + '%', type]
  )
  if (fuzzy.length > 0) return fuzzy[0].id

  const result = await db.query(
    'INSERT INTO tag (tag_name, tag_type, sort, status, create_time, update_time, is_delete) VALUES (?, ?, 99, 1, NOW(), NOW(), 0)',
    [name, type]
  )
  return result.insertId
}

// 解析品类名称为 tag 名称
function normalizeCategory(name) {
  if (!name) return null
  const map = {
    '纸制品': '纸制品', '亚克力制品': '亚克力制品', 'PVC制品': 'PVC制品',
    '金属制品': '金属制品', '马口铁徽章': '马口铁徽章', '毛绒制品': '毛绒制品',
    '日用品': '日用品', '包装类': '包装类', '线下活动物料': '线下活动物料',
    '明信片': '明信片', '镭射票': '镭射票', '文件夹': '文件夹',
    '亚克力立牌': '亚克力立牌', '拍立得': '拍立得', '吧唧': '吧唧',
    '纸袋': '纸袋', '贴纸': '贴纸', '集章手册': '集章手册',
  }
  if (map[name]) return map[name]
  // 模糊匹配：XX制品 → 归类到大类
  if (name.includes('纸')) return '纸制品'
  if (name.includes('亚克力')) return '亚克力制品'
  if (name.includes('PVC') || name.includes('pvc')) return 'PVC制品'
  if (name.includes('金属')) return '金属制品'
  if (name.includes('马口铁') || name.includes('徽章') || name.includes('吧唧')) return '马口铁徽章'
  if (name.includes('毛绒') || name.includes('棉')) return '毛绒制品'
  if (name.includes('包装') || name.includes('纸袋')) return '包装类'
  if (name.includes('立牌')) return '亚克力立牌'
  if (name.includes('明信片')) return '明信片'
  if (name.includes('镭射票') || name.includes('票')) return '镭射票'
  return name
}

async function importSheet1() {
  console.log('\n=== 导入：项目及人天统计 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const ws = wb.Sheets['项目及人天统计']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  let success = 0, failed = 0, skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      if (!r['文本']) { skipped++; continue }

      // 检查重复
      const dup = await db.query('SELECT id FROM project WHERE project_name = ? AND is_delete = 0', [r['文本']])
      if (dup.length > 0) { skipped++; continue }

      // 处理供应商
      const sup = resolveSupplier(r['供应商'])
      const supplierId = await getOrCreateSupplier(sup.fullName, sup.shortName)

      // 处理标签
      const ipId = await getOrCreateTag(r['IP'], 'ip')
      const categoryName = normalizeCategory(r['需求种类']) || normalizeCategory(r['项目'])
      const categoryId = categoryName ? await getOrCreateTag(categoryName, 'category') : null

      // 插入项目
      await db.query(`
        INSERT INTO project (
          project_name, ip_tag_ids, category_tag_ids, region,
          supplier_id, total_amount, man_days, requester,
          project_leader, purchase_order_no, project_start_date, project_end_date,
          remark, status, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW(), 0)
      `, [
        r['文本'],
        ipId ? String(ipId) : null,
        categoryId ? String(categoryId) : null,
        r['区服'] || null,
        supplierId,
        num(r['项目总价']),
        num(r['投入人天']),
        r['需求人'] || null,
        (r['主要负责人'] || '').split(',')[0].trim() || null,
        r['相关请购需求单'] || null,
        excelDateToISO(r['开始日期']),
        excelDateToISO(r['结束日期']),
        r['备注'] || null
      ])
      success++
    } catch (e) {
      failed++
      errors.push(`Row ${i + 2}: ${r['文本']} - ${e.message}`)
    }
  }

  console.log(`  Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`)
  if (errors.length > 0) console.log('  Errors:', errors.slice(0, 5).join('; '))
}

async function importSheet2() {
  console.log('\n=== 导入：周边价格登记 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const ws = wb.Sheets['周边价格登记（仅国服）']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  let success = 0, failed = 0, skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      if (!r['单品']) { skipped++; continue }

      // 处理供应商
      const sup = resolveSupplier(r['供应商'])
      const supplierId = await getOrCreateSupplier(sup.fullName, sup.shortName)

      // 检查重复（相同单品+供应商+项目）
      const dup = await db.query(
        'SELECT id FROM project WHERE product_name = ? AND supplier_id = ? AND is_delete = 0',
        [r['单品'], supplierId]
      )
      if (dup.length > 0) { skipped++; continue }

      const ipId = await getOrCreateTag(r['IP'], 'ip')
      const categoryName = normalizeCategory(r['品类'])
      const categoryId = categoryName ? await getOrCreateTag(categoryName, 'category') : null

      const totalAmount = num(r['总价'])
      const unitPrice = num(r['单价'])
      const totalQuantity = num(r['总数量'])

      await db.query(`
        INSERT INTO project (
          project_name, product_name, ip_tag_ids, category_tag_ids,
          supplier_id, unit_price, total_amount,
          style_count, single_quantity, total_quantity,
          sample_cycle, mass_production_cycle,
          sample_fee, design_fee, other_fee,
          status, create_time, update_time, is_delete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW(), 0)
      `, [
        r['项目'] || r['单品'],
        r['单品'],
        ipId ? String(ipId) : null,
        categoryId ? String(categoryId) : null,
        supplierId,
        unitPrice,
        totalAmount,
        num(r['款式']),
        num(r['单款数量']),
        totalQuantity,
        num(r['打样（天）']),
        num(r['大货（天）']),
        num(r['打样费']),
        num(r['设计费']),
        num(r['其他费用'])
      ])
      success++
    } catch (e) {
      failed++
      errors.push(`Row ${i + 2}: ${r['单品']} - ${e.message}`)
    }
  }

  console.log(`  Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`)
  if (errors.length > 0) console.log('  Errors:', errors.slice(0, 5).join('; '))
}

async function importSheet3() {
  console.log('\n=== 导入：供应商库 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const ws = wb.Sheets['供应商库']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  let success = 0, failed = 0, skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      if (!r['供应商']) { skipped++; continue }

      // 检查是否已存在
      const existing = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [r['供应商']])
      if (existing.length > 0) {
        // 更新已有供应商信息
        await db.query(`
          UPDATE supplier SET
            supplier_short_name = COALESCE(?, supplier_short_name),
            contact_person = COALESCE(?, contact_person),
            contact_phone = COALESCE(?, contact_phone),
            contact_email = COALESCE(?, contact_email),
            contract_type = COALESCE(?, contract_type),
            rating = COALESCE(?, rating),
            remark = COALESCE(?, remark),
            cooperation_status = 'active',
            update_time = NOW()
          WHERE id = ?
        `, [
          r['简写'] || null,
          r['联系人'] || null,
          r['联系电话'] || null,
          r['联系邮箱'] || null,
          r['单次合同'] === '框架合同' ? 'framework' : 'project',
          num(r['主观评分']) ? Math.round(num(r['主观评分']) / 20) : null, // 100分制 → 5分制
          r['备注'] || null,
          existing[0].id
        ])
        success++
      } else {
        // 新增供应商
        await db.query(`
          INSERT INTO supplier (
            supplier_name, supplier_short_name, contact_person, contact_phone,
            contact_email, contract_type, rating, remark, cooperation_status,
            create_time, update_time, is_delete
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), 0)
        `, [
          r['供应商'],
          r['简写'] || null,
          r['联系人'] || null,
          r['联系电话'] || null,
          r['联系邮箱'] || null,
          r['单次合同'] === '框架合同' ? 'framework' : 'project',
          num(r['主观评分']) ? Math.round(num(r['主观评分']) / 20) : null,
          r['备注'] || null
        ])
        success++
      }
    } catch (e) {
      failed++
    }
  }

  console.log(`  Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`)
}

async function main() {
  console.log('开始导入飞书数据...')
  console.log('Excel: 2025.4-2026.4周边制作汇总.xlsx')
  console.log('模式: 增量导入（跳过重复，保留现有数据）')

  // 先加载供应商简写→全名映射
  loadSupplierMap()

  await importSheet3() // 先导入供应商（项目需要供应商ID）
  await importSheet1() // 项目及人天统计
  await importSheet2() // 周边价格登记

  // 统计
  const [pCount] = await db.query('SELECT COUNT(*) as cnt FROM project WHERE is_delete = 0')
  const [sCount] = await db.query('SELECT COUNT(*) as cnt FROM supplier WHERE is_delete = 0')
  console.log(`\n=== 导入完成 ===`)
  console.log(`项目总数: ${pCount.cnt}`)
  console.log(`供应商总数: ${sCount.cnt}`)
}

main().catch(e => { console.error('Import failed:', e); process.exit(1) })