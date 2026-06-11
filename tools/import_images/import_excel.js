/**
 * Excel 全量导入脚本
 * 对应表：项目及人天统计 → project
 *         周边价格登记（仅国服） → price_record
 *         供应商库 → supplier
 *
 * 用法：node import_excel.js <Excel路径>
 */

const XLSX = require('xlsx')
const mysql = require('mysql2/promise')
const path = require('path')

const DB = {
  host: '127.0.0.1', port: 3307,
  database: 'goods_visualization',
  user: 'root', password: 'Xie20040520@'
}

// Excel 日期序列号 → YYYY-MM-DD
function excelDate(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    // 已是日期字符串
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) return s.replace(/\//g, '-').substring(0, 10)
    return null
  }
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${d.y}-${mm}-${dd}`
  }
  return null
}

function num(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function str(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// ── 1. 项目及人天统计 → project ────────────────────────────────
async function importProjects(db, rows) {
  // 预先加载供应商名→ID 映射
  const [supRows] = await db.execute('SELECT id, supplier_name, supplier_short_name FROM supplier')
  const supMap = {}
  for (const s of supRows) {
    if (s.supplier_name) supMap[s.supplier_name.trim()] = s.id
    if (s.supplier_short_name) supMap[s.supplier_short_name.trim()] = s.id
  }

  await db.execute('DELETE FROM project WHERE 1=1')

  const sql = `
    INSERT INTO project
      (product_name, ip_tag_ids, project_year, project_name, purchase_order_no,
       total_amount, person_days, requester, region, supplier_id,
       project_start_date, project_end_date, project_leader, quotation_file,
       requirement_type, remark, file_storage, parent_record)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

  let ok = 0, skip = 0
  for (const r of rows) {
    const supplierName = str(r['供应商'])
    const supplierId = supplierName ? (supMap[supplierName] || null) : null

    const vals = [
      str(r['文本']),
      str(r['IP']),
      num(r['年份']),
      str(r['项目']),
      str(r['相关请购需求单']),
      num(r['项目总价']),
      num(r['投入人天']),
      str(r['需求人']),
      str(r['区服']),
      supplierId,
      excelDate(r['开始日期']),
      excelDate(r['结束日期']),
      str(r['主要负责人']),
      str(r['报价单']),
      str(r['需求种类']),
      str(r['备注']),
      str(r['文件存储地址']),
      str(r['父记录'])
    ]
    if (!vals[0] && !vals[3]) { skip++; continue }
    try {
      await db.execute(sql, vals)
      ok++
    } catch (e) {
      console.error('  ❌ project 行错误:', e.message, JSON.stringify(r))
    }
  }
  return { ok, skip }
}

// ── 2. 周边价格登记 → price_record ────────────────────────────
async function importPriceRecords(db, rows) {
  await db.execute('DELETE FROM price_record WHERE 1=1')

  const sql = `
    INSERT INTO price_record
      (product_name, category, supplier_name, ip, image, project_name,
       sample_days, mass_production_days, style_count, single_quantity,
       design_fee, sample_fee, unit_price, total_quantity,
       other_fee, total_price, production_info, remark1, remark2)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

  let ok = 0, skip = 0
  for (const r of rows) {
    const vals = [
      str(r['单品']),
      str(r['品类']),
      str(r['供应商']),
      str(r['IP']),
      str(r['图片']),
      str(r['项目']),
      num(r['打样（天）']),
      num(r['大货（天）']),
      num(r['款式']),
      num(r['单款数量']),
      num(r['设计费']),
      num(r['打样费']),
      num(r['单价']),
      num(r['总数量']),
      num(r['其他费用']),
      num(r['总价']),
      str(r['生产信息']),
      str(r['备注1']),
      str(r['备注2'])
    ]
    if (!vals[0]) { skip++; continue }
    try {
      await db.execute(sql, vals)
      ok++
    } catch (e) {
      console.error('  ❌ price_record 行错误:', e.message)
    }
  }
  return { ok, skip }
}

// ── 3. 供应商库 → supplier ─────────────────────────────────────
async function importSuppliers(db, rows) {
  // 供应商用 upsert，按名称更新，不清空
  const sql = `
    INSERT INTO supplier (supplier_name, supplier_short_name, contract_type, contact_person, contact_phone, rating, remark, contact_email)
    VALUES (?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      supplier_short_name = VALUES(supplier_short_name),
      contract_type       = VALUES(contract_type),
      contact_person      = VALUES(contact_person),
      contact_phone       = VALUES(contact_phone),
      rating              = VALUES(rating),
      remark              = VALUES(remark),
      contact_email       = VALUES(contact_email)`

  // 合同类型映射
  const contractMap = {
    '单次合同': 'project', '框架合同': 'framework',
    '三方合同': 'third_party', '无合同': 'none', '无': 'none'
  }

  let ok = 0, skip = 0
  for (const r of rows) {
    const name = str(r['供应商'])
    if (!name) { skip++; continue }
    const contractRaw = str(r['单次合同']) || ''
    const contract = contractMap[contractRaw] || 'project'
    const vals = [
      name,
      str(r['简写']),
      contract,
      str(r['联系人']),
      str(r['联系电话']),
      num(r['主观评分']),
      str(r['备注']),
      str(r['联系邮箱'])
    ]
    try {
      await db.execute(sql, vals)
      ok++
    } catch (e) {
      console.error('  ❌ supplier 行错误:', e.message, name)
    }
  }
  return { ok, skip }
}

// ── 主流程 ──────────────────────────────────────────────────────
async function main() {
  const xlsxPath = process.argv[2] || 'C:/Users/xxwf/Downloads/2025.4-2026.4周边制作汇总 (1).xlsx'
  console.log(`\n📂 读取: ${xlsxPath}`)

  const wb = XLSX.readFile(xlsxPath)
  const db = await mysql.createConnection(DB)

  const results = {}

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName])
    console.log(`\n📋 ${sheetName} (${rows.length} 行)`)

    if (sheetName === '项目及人天统计') {
      results.project = await importProjects(db, rows)
      console.log(`   ✅ project: ${results.project.ok} 条  跳过 ${results.project.skip} 条`)
    } else if (sheetName === '周边价格登记（仅国服）') {
      results.price = await importPriceRecords(db, rows)
      console.log(`   ✅ price_record: ${results.price.ok} 条  跳过 ${results.price.skip} 条`)
    } else if (sheetName === '供应商库') {
      results.supplier = await importSuppliers(db, rows)
      console.log(`   ✅ supplier: ${results.supplier.ok} 条  跳过 ${results.supplier.skip} 条`)
    }
  }

  await db.end()
  console.log('\n🎉 全部导入完成\n')
}

main().catch(e => { console.error('❌ 错误:', e.message); process.exit(1) })
