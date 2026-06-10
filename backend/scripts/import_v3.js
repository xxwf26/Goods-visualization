/**
 * 需求文档同步导入：23 字段严格匹配 "历史周边记录库"
 * 数据来源: Sheet1(项目及人天统计) + Sheet2(周边价格登记) 交叉匹配
 */
const XLSX = require('xlsx')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const db = require('../src/config/database')

function excelDateToISO(serial) {
  if (!serial) return null
  if (typeof serial === 'string') { const d = new Date(serial); if (!isNaN(d.getTime())) return serial.split('T')[0]; return null }
  return new Date(Date.UTC(0, 0, serial - 1)).toISOString().split('T')[0]
}
function num(v) { return v ? Number(v) : null }

const TAG_CACHE = {}
async function getTagId(name, type) {
  if (!name) return null
  const key = type + ':' + name
  if (TAG_CACHE[key]) return TAG_CACHE[key]
  const e = await db.query('SELECT id FROM tag WHERE tag_name = ? AND tag_type = ? AND is_delete = 0', [name, type])
  if (e.length > 0) { TAG_CACHE[key] = e[0].id; return e[0].id }
  const r = await db.query('INSERT INTO tag (tag_name, tag_type, sort, status, create_time, update_time, is_delete) VALUES (?,?,99,1,NOW(),NOW(),0)', [name, type])
  TAG_CACHE[key] = r.insertId
  return r.insertId
}

const SUPPLIER_CACHE = {}
async function getSupplierId(name) {
  if (!name) return null
  const n = name.trim()
  if (SUPPLIER_CACHE[n]) return SUPPLIER_CACHE[n]
  const e = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [n])
  if (e.length > 0) { SUPPLIER_CACHE[n] = e[0].id; return e[0].id }
  const r = await db.query("INSERT INTO supplier (supplier_name, cooperation_status, create_time, update_time, is_delete) VALUES (?,'active',NOW(),NOW(),0)", [n])
  SUPPLIER_CACHE[n] = r.insertId
  return r.insertId
}

async function main() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const s1 = XLSX.utils.sheet_to_json(wb.Sheets['项目及人天统计'], { defval: '' })
  const s2 = XLSX.utils.sheet_to_json(wb.Sheets['周边价格登记（仅国服）'], { defval: '' })

  // 建立 Sheet 1 索引: 按 (IP, 供应商) → 项目级信息
  const s1Index = {}
  for (const r of s1) {
    if (!r['文本']) continue
    const key = (r['IP'] || '') + '|||' + (r['供应商'] || '')
    if (!s1Index[key]) s1Index[key] = r
  }

  // 清除旧数据重新导入
  await db.query('SET FOREIGN_KEY_CHECKS = 0')
  await db.query('TRUNCATE TABLE project')
  await db.query('SET FOREIGN_KEY_CHECKS = 1')
  console.log('Cleared old project data')

  let ok = 0, fail = 0
  const errors = []

  // 以 Sheet 2 为主表（每一行=一个单品记录）
  for (const r2 of s2) {
    try {
      if (!r2['单品']) continue

      // 匹配 Sheet 1: 按 (IP, 供应商) 查找项目级信息
      const matchKey = (r2['IP'] || '') + '|||' + (r2['供应商'] || '')
      const s1Row = s1Index[matchKey] || null

      // === 23 字段严格对应需求文档 ===
      const projectName = s1Row ? s1Row['文本'] : (r2['项目'] || r2['单品'])
      const ipName = r2['IP'] || (s1Row ? s1Row['IP'] : null)
      const region = s1Row ? s1Row['区服'] : null

      const categoryName = r2['品类'] || null
      const productName = r2['单品']
      const styleCount = num(r2['款式'])
      const singleQuantity = num(r2['单款数量'])
      const totalQuantity = num(r2['总数量'])
      const unitPrice = num(r2['单价'])
      const totalAmount = num(r2['总价']) || (s1Row ? num(s1Row['项目总价']) : null)
      const supplierName = r2['供应商'] || (s1Row ? s1Row['供应商'] : null)

      const sampleCycle = num(r2['打样（天）'])
      const massCycle = num(r2['大货（天）'])
      const sampleFee = num(r2['打样费'])
      const designFee = num(r2['设计费'])
      const otherFee = num(r2['其他费用'])

      const startDate = s1Row ? excelDateToISO(s1Row['开始日期']) : null
      const endDate = s1Row ? excelDateToISO(s1Row['结束日期']) : null
      const leader = s1Row ? (s1Row['主要负责人'] || '').split(',')[0].trim() || null : null
      const requester = s1Row ? s1Row['需求人'] : null
      const remark = [r2['备注1'], r2['备注2'], s1Row?.备注].filter(Boolean).join('; ') || null
      const purchaseOrder = s1Row ? s1Row['相关请购需求单'] : null
      const effectImages = r2['图片'] || null  // 效果图/样品图

      // 解析标签 ID
      const ipId = ipName ? await getTagId(ipName, 'ip') : null
      const categoryId = categoryName ? await getTagId(categoryName, 'category') : null
      const supplierId = supplierName ? await getSupplierId(supplierName) : null

      await db.query(`INSERT INTO project (
        project_name, ip_tag_ids, region, category_tag_ids,
        product_name, style_count, single_quantity, total_quantity,
        unit_price, total_amount, supplier_id,
        sample_cycle, mass_production_cycle, sample_fee, design_fee, other_fee,
        project_start_date, project_end_date, project_leader, requester,
        remark, effect_images, purchase_order_no,
        status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        projectName,
        ipId ? String(ipId) : null,
        region,
        categoryId ? String(categoryId) : null,
        productName,
        styleCount, singleQuantity, totalQuantity,
        unitPrice, totalAmount,
        supplierId,
        sampleCycle, massCycle,
        sampleFee, designFee, otherFee,
        startDate, endDate,
        leader, requester,
        remark, effectImages, purchaseOrder
      ])
      ok++
    } catch (e) {
      fail++
      if (fail <= 5) errors.push(`${r2['单品']}: ${e.message}`)
    }
  }

  console.log(`Imported: ${ok}, Failed: ${fail}`)
  if (errors.length > 0) console.log('Errors:', errors.join('\n'))

  const [p] = await db.query('SELECT COUNT(*) as c FROM project WHERE is_delete = 0')
  console.log(`Total projects: ${p.c}`)
}

main().catch(e => { console.error(e); process.exit(1) })