/**
 * 飞书数据严格匹配导入 v2
 * 逐列对应 Excel 表头，不遗漏任何字段
 */
const XLSX = require('xlsx')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const db = require('../src/config/database')

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

function num(v) { return v ? Number(v) : null }

// 供应商简写→全名
let supplierMap = {}
function loadSupplierMap() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const ws = wb.Sheets['供应商库']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  rows.forEach(r => { if (r['简写'] && r['供应商']) supplierMap[r['简写']] = r['供应商'] })
}

function resolveSupplier(name) {
  if (!name) return null
  const t = name.trim()
  return supplierMap[t] || t
}

async function getOrCreateSupplier(fullName, shortName) {
  if (!fullName) return null
  const e = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [fullName])
  if (e.length > 0) return e[0].id
  if (shortName) {
    const b = await db.query('SELECT id FROM supplier WHERE supplier_short_name = ? AND is_delete = 0', [shortName])
    if (b.length > 0) return b[0].id
  }
  const r = await db.query(
    'INSERT INTO supplier (supplier_name, supplier_short_name, cooperation_status, create_time, update_time, is_delete) VALUES (?, ?, "active", NOW(), NOW(), 0)',
    [fullName, shortName || fullName]
  )
  return r.insertId
}

async function getOrCreateTag(name, type) {
  if (!name) return null
  const e = await db.query('SELECT id FROM tag WHERE tag_name = ? AND tag_type = ? AND is_delete = 0', [name, type])
  if (e.length > 0) return e[0].id
  const f = await db.query('SELECT id FROM tag WHERE tag_name LIKE ? AND tag_type = ? AND is_delete = 0', ['%'+name.substring(0,2)+'%', type])
  if (f.length > 0) return f[0].id
  const r = await db.query(
    'INSERT INTO tag (tag_name, tag_type, sort, status, create_time, update_time, is_delete) VALUES (?, ?, 99, 1, NOW(), NOW(), 0)',
    [name, type]
  )
  return r.insertId
}

// === Sheet 1: 项目及人天统计 ===
async function importSheet1() {
  console.log('\n=== Sheet 1: 项目及人天统计 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['项目及人天统计'], { defval: '' })
  let ok = 0, fail = 0, skip = 0

  for (const r of rows) {
    try {
      if (!r['文本']) { skip++; continue }

      const dup = await db.query('SELECT id FROM project WHERE project_name = ? AND is_delete = 0 AND man_days IS NOT NULL', [r['文本']])
      if (dup.length > 0) { skip++; continue }

      const supFull = resolveSupplier(r['供应商'])
      const supId = await getOrCreateSupplier(supFull, r['供应商'])
      const ipId = await getOrCreateTag(r['IP'], 'ip')

      // 项目(品类) 和 需求种类(场景)
      const sceneName = r['需求种类'] || null
      let sceneTagId = null
      if (sceneName) sceneTagId = await getOrCreateTag(sceneName, 'scene')

      await db.query(`INSERT INTO project (
        project_name, project_year, ip_tag_ids, scene_name, scene_tag_ids,
        purchase_order_no, total_amount, man_days, requester,
        region, supplier_id, project_start_date, project_end_date,
        project_leader, quotation_file, file_storage_path, parent_record,
        remark, status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['文本'], num(r['年份']),
        ipId ? String(ipId) : null,
        sceneName,
        sceneTagId ? String(sceneTagId) : null,
        r['相关请购需求单'] || null,
        num(r['项目总价']), num(r['投入人天']),
        r['需求人'] || null,
        r['区服'] || null, supId,
        excelDateToISO(r['开始日期']), excelDateToISO(r['结束日期']),
        (r['主要负责人'] || '').split(',')[0].trim() || null,
        r['报价单'] || null,
        r['文件存储地址'] || null,
        r['父记录'] || null,
        r['备注'] || null
      ])
      ok++
    } catch (e) { fail++; if (fail <= 3) console.error('  Error:', r['文本'], e.message) }
  }
  console.log(`  OK: ${ok}, Skip: ${skip}, Fail: ${fail}`)
}

// === Sheet 2: 周边价格登记 ===
async function importSheet2() {
  console.log('\n=== Sheet 2: 周边价格登记 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['周边价格登记（仅国服）'], { defval: '' })
  let ok = 0, fail = 0, skip = 0

  for (const r of rows) {
    try {
      if (!r['单品']) { skip++; continue }

      const supFull = resolveSupplier(r['供应商'])
      const supId = await getOrCreateSupplier(supFull, r['供应商'])
      const ipId = await getOrCreateTag(r['IP'], 'ip')
      const catId = await getOrCreateTag(r['品类'], 'category')

      const dup = await db.query(
        'SELECT id FROM project WHERE product_name = ? AND supplier_id = ? AND is_delete = 0',
        [r['单品'], supId]
      )
      if (dup.length > 0) { skip++; continue }

      await db.query(`INSERT INTO project (
        product_name, category_tag_ids, supplier_id, ip_tag_ids,
        project_name, sample_cycle, mass_production_cycle,
        style_count, single_quantity, design_fee, sample_fee,
        unit_price, total_quantity, other_fee, total_amount,
        remark, status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['单品'],
        catId ? String(catId) : null, supId,
        ipId ? String(ipId) : null,
        r['项目'] || null,
        num(r['打样（天）']), num(r['大货（天）']),
        num(r['款式']), num(r['单款数量']),
        num(r['设计费']), num(r['打样费']),
        num(r['单价']), num(r['总数量']),
        num(r['其他费用']), num(r['总价']),
        [r['备注1'], r['备注2']].filter(Boolean).join('; ') || null
      ])
      ok++
    } catch (e) { fail++; if (fail <= 3) console.error('  Error:', r['单品'], e.message) }
  }
  console.log(`  OK: ${ok}, Skip: ${skip}, Fail: ${fail}`)
}

// === Sheet 3: 供应商库 ===
async function importSheet3() {
  console.log('\n=== Sheet 3: 供应商库 ===')
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['供应商库'], { defval: '' })
  let ok = 0, fail = 0, skip = 0

  for (const r of rows) {
    try {
      if (!r['供应商']) { skip++; continue }

      const existing = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [r['供应商']])
      if (existing.length > 0) {
        await db.query(`UPDATE supplier SET
          supplier_short_name=COALESCE(?,supplier_short_name),
          contact_person=COALESCE(?,contact_person),
          contact_phone=COALESCE(?,contact_phone),
          contact_email=COALESCE(?,contact_email),
          contract_type=COALESCE(?,contract_type),
          rating=COALESCE(?,rating),
          remark=COALESCE(?,remark),
          cooperation_status='active',
          update_time=NOW() WHERE id=?`,
          [r['简写']||null, r['联系人']||null, r['联系电话']||null, r['联系邮箱']||null,
           r['单次合同']==='框架合同'?'framework':'project',
           num(r['主观评分']) ? Math.round(num(r['主观评分'])/20) : null,
           r['备注']||null, existing[0].id])
        ok++
      } else {
        await db.query(`INSERT INTO supplier (
          supplier_name,supplier_short_name,contact_person,contact_phone,contact_email,
          contract_type,rating,remark,cooperation_status,create_time,update_time,is_delete
        ) VALUES (?,?,?,?,?,?,?,?,'active',NOW(),NOW(),0)`,
          [r['供应商'], r['简写']||null, r['联系人']||null, r['联系电话']||null,
           r['联系邮箱']||null,
           r['单次合同']==='框架合同'?'framework':'project',
           num(r['主观评分']) ? Math.round(num(r['主观评分'])/20) : null,
           r['备注']||null])
        ok++
      }
    } catch (e) { fail++ }
  }
  console.log(`  OK: ${ok}, Skip: ${skip}, Fail: ${fail}`)
}

async function main() {
  console.log('严格匹配导入 v2')
  loadSupplierMap()
  await importSheet3()
  await importSheet1()
  await importSheet2()
  const [p] = await db.query('SELECT COUNT(*) as c FROM project WHERE is_delete = 0')
  const [s] = await db.query('SELECT COUNT(*) as c FROM supplier WHERE is_delete = 0')
  console.log(`\n总计: ${p.c} 项目, ${s.c} 供应商`)
}

main().catch(e => { console.error(e); process.exit(1) })