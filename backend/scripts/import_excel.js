/**
 * 将两个 Excel sheet 数据分别导入到对应的数据库表
 * Sheet1 "项目及人天统计" → project 表 (18 字段)
 * Sheet2 "周边价格登记（仅国服）" → price_record 表 (19 字段)
 */
const path = require('path')
const XLSX = require('xlsx')
const mysql = require('mysql2/promise')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const EXCEL = path.join(__dirname, '..', '..', '2025.4-2026.4周边制作汇总.xlsx')

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'dipin808',
  database: process.env.DB_NAME || 'goods_visualization'
}

function excelDateToStr(val) {
  if (!val) return null
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = new Date((val - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  return String(val).trim() || null
}

function parseIntOrNull(val) {
  if (val === '' || val === null || val === undefined) return null
  const n = parseInt(val)
  return isNaN(n) ? null : n
}

function parseFloatOrNull(val) {
  if (val === '' || val === null || val === undefined) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function importProjects(conn) {
  const wb = XLSX.readFile(EXCEL)
  const ws = wb.Sheets['项目及人天统计']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const dataRows = rows.slice(1).filter(r => r[0] && String(r[0]).trim())

  console.log(`项目及人天统计: ${dataRows.length} 条数据`)

  // 清空现有数据
  await conn.query('UPDATE project SET is_delete = 1 WHERE is_delete = 0')
  console.log('已清空 project 表')

  let imported = 0
  for (const row of dataRows) {
    const [textName, ip, year, project, purchaseOrder, totalPrice, personDays, requester, region, supplier, startDate, endDate, leader, quotation, reqType, remark, fileStorage, parentRecord] = row

    try {
      await conn.query(`
        INSERT INTO project (
          product_name, ip_tag_ids, project_year, project_name,
          purchase_order_no, total_amount, person_days, requester,
          region, supplier_name, project_start_date, project_end_date,
          project_leader, quotation_file, requirement_type, remark,
          file_storage, parent_record,
          status, is_delete, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 0, NOW(), NOW())
      `, [
        String(textName).trim(),
        String(ip).trim() || null,
        String(year).trim() || null,
        String(project).trim(),
        String(purchaseOrder).trim().replace(/\n/g, ' ') || null,
        parseFloatOrNull(totalPrice),
        parseFloatOrNull(personDays),
        String(requester).trim() || null,
        String(region).trim() || null,
        String(supplier).trim() || null,
        excelDateToStr(startDate),
        excelDateToStr(endDate),
        String(leader).trim() || null,
        String(quotation).trim() || null,
        String(reqType).trim() || null,
        String(remark).trim() || null,
        String(fileStorage).trim() || null,
        String(parentRecord).trim() || null
      ])
      imported++
    } catch (e) {
      console.error(`导入失败 row ${imported + 1}:`, e.message)
    }
  }
  console.log(`project: 成功导入 ${imported} 条`)
}

async function importPriceRecords(conn) {
  const wb = XLSX.readFile(EXCEL)
  const ws = wb.Sheets['周边价格登记（仅国服）']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const dataRows = rows.slice(1).filter(r => r[0] && String(r[0]).trim())

  console.log(`\n周边价格登记（仅国服）: ${dataRows.length} 条数据`)

  // 清空现有数据
  await conn.query('UPDATE price_record SET is_delete = 1 WHERE is_delete = 0')
  console.log('已清空 price_record 表')

  let imported = 0
  for (const row of dataRows) {
    const [product, category, supplier, ip, image, project, sampleDays, massDays, styleCount, singleQty, designFee, sampleFee, unitPrice, totalQty, otherFee, totalPrice, prodInfo, remark1, remark2] = row

    try {
      await conn.query(`
        INSERT INTO price_record (
          product_name, category, supplier_name, ip, image, project_name,
          sample_days, mass_production_days, style_count, single_quantity,
          design_fee, sample_fee, unit_price, total_quantity, other_fee,
          total_price, production_info, remark1, remark2,
          is_delete, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `, [
        String(product).trim(),
        String(category).trim() || null,
        String(supplier).trim() || null,
        String(ip).trim() || null,
        String(image).trim() || null,
        String(project).trim() || null,
        parseIntOrNull(sampleDays),
        parseIntOrNull(massDays),
        parseIntOrNull(styleCount),
        parseIntOrNull(singleQty),
        parseFloatOrNull(designFee),
        parseFloatOrNull(sampleFee),
        parseFloatOrNull(unitPrice),
        parseIntOrNull(totalQty),
        parseFloatOrNull(otherFee),
        parseFloatOrNull(totalPrice),
        String(prodInfo).trim() || null,
        String(remark1).trim() || null,
        String(remark2).trim() || null
      ])
      imported++
    } catch (e) {
      console.error(`导入失败 row ${imported + 1}:`, e.message)
    }
  }
  console.log(`price_record: 成功导入 ${imported} 条`)
}

async function main() {
  const conn = await mysql.createConnection(DB)
  try {
    await importProjects(conn)
    await importPriceRecords(conn)
    const [pc] = await conn.query('SELECT COUNT(*) as c FROM project WHERE is_delete=0')
    const [pr] = await conn.query('SELECT COUNT(*) as c FROM price_record WHERE is_delete=0')
    console.log(`\n=== 导入完成 ===`)
    console.log(`project (项目及人天统计): ${pc.c} 条`)
    console.log(`price_record (周边价格登记): ${pr.c} 条`)
  } catch (e) {
    console.error('导入失败:', e)
  } finally {
    await conn.end()
  }
}

main()