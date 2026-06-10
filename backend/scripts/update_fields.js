/**
 * UPDATE only: 从 Excel 补充已有记录的缺失字段，不删除任何数据
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

async function getSupplierId(name) {
  if (!name) return null
  const e = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [name])
  if (e.length > 0) return e[0].id
  const r = await db.query("INSERT INTO supplier (supplier_name, cooperation_status, create_time, update_time, is_delete) VALUES (?,'active',NOW(),NOW(),0)", [name])
  return r.insertId
}

async function getTagId(name, type) {
  if (!name) return null
  const e = await db.query('SELECT id FROM tag WHERE tag_name = ? AND tag_type = ? AND is_delete = 0', [name, type])
  if (e.length > 0) return e[0].id
  const r = await db.query('INSERT INTO tag (tag_name, tag_type, sort, status, create_time, update_time, is_delete) VALUES (?,?,99,1,NOW(),NOW(),0)', [name, type])
  return r.insertId
}

async function main() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')

  // === Sheet 1: 项目及人天统计 → UPDATE 补充字段 ===
  console.log('=== Sheet 1: 补充缺失字段 ===')
  const s1 = XLSX.utils.sheet_to_json(wb.Sheets['项目及人天统计'], { defval: '' })
  let updated = 0, created = 0

  for (const r of s1) {
    if (!r['文本']) continue
    const found = await db.query('SELECT id FROM project WHERE project_name = ? AND is_delete = 0 LIMIT 1', [r['文本']])

    if (found.length > 0) {
      // UPDATE: 补充所有缺失字段
      const id = found[0].id
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null
      const supName = r['供应商']?.trim()
      let supId = null
      if (supName) supId = await getSupplierId(supName)

      await db.query(`UPDATE project SET
        project_year = ?, ip_tag_ids = COALESCE(?, ip_tag_ids),
        region = COALESCE(?, region),
        scene_name = COALESCE(?, scene_name),
        purchase_order_no = COALESCE(?, purchase_order_no),
        supplier_id = COALESCE(?, supplier_id),
        total_amount = COALESCE(?, total_amount),
        man_days = COALESCE(?, man_days),
        requester = COALESCE(?, requester),
        project_leader = COALESCE(?, project_leader),
        quotation_file = COALESCE(?, quotation_file),
        file_storage_path = COALESCE(?, file_storage_path),
        parent_record = COALESCE(?, parent_record),
        project_start_date = COALESCE(?, project_start_date),
        project_end_date = COALESCE(?, project_end_date),
        remark = COALESCE(?, remark),
        update_time = NOW()
        WHERE id = ?`, [
        num(r['年份']),
        ipId ? String(ipId) : null,
        r['区服'] || null,
        r['需求种类'] || null,
        r['相关请购需求单'] || null,
        supId,
        num(r['项目总价']),
        num(r['投入人天']),
        r['需求人'] || null,
        (r['主要负责人'] || '').split(',')[0].trim() || null,
        r['报价单'] || null,
        r['文件存储地址'] || null,
        r['父记录'] || null,
        excelDateToISO(r['开始日期']),
        excelDateToISO(r['结束日期']),
        r['备注'] || null,
        id
      ])
      updated++
    } else {
      // INSERT: 记录不存在则新建
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null
      const supId = r['供应商'] ? await getSupplierId(r['供应商'].trim()) : null
      await db.query(`INSERT INTO project (
        project_name, project_year, ip_tag_ids, region,
        scene_name, purchase_order_no, supplier_id,
        total_amount, man_days, requester, project_leader,
        quotation_file, file_storage_path, parent_record,
        project_start_date, project_end_date, remark,
        status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['文本'], num(r['年份']), ipId ? String(ipId) : null,
        r['区服'] || null, r['需求种类'] || null,
        r['相关请购需求单'] || null, supId,
        num(r['项目总价']), num(r['投入人天']),
        r['需求人'] || null, (r['主要负责人']||'').split(',')[0].trim()||null,
        r['报价单']||null, r['文件存储地址']||null, r['父记录']||null,
        excelDateToISO(r['开始日期']), excelDateToISO(r['结束日期']), r['备注']||null
      ])
      created++
    }
  }
  console.log(`  Updated: ${updated}, Created: ${created}`)

  // === Sheet 2: 周边价格登记 → UPDATE ===
  console.log('\n=== Sheet 2: 补充缺失字段 ===')
  const s2 = XLSX.utils.sheet_to_json(wb.Sheets['周边价格登记（仅国服）'], { defval: '' })
  updated = 0; created = 0
  for (const r of s2) {
    if (!r['单品']) continue
    const found = await db.query('SELECT id FROM project WHERE product_name = ? AND is_delete = 0 LIMIT 1', [r['单品']])
    if (found.length > 0) {
      const id = found[0].id
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null
      const catId = r['品类'] ? await getTagId(r['品类'], 'category') : null
      const supId = r['供应商'] ? await getSupplierId(r['供应商'].trim()) : null
      await db.query(`UPDATE project SET
        project_name = COALESCE(?, project_name),
        ip_tag_ids = COALESCE(?, ip_tag_ids),
        category_tag_ids = COALESCE(?, category_tag_ids),
        supplier_id = COALESCE(?, supplier_id),
        sample_cycle = COALESCE(?, sample_cycle),
        mass_production_cycle = COALESCE(?, mass_production_cycle),
        style_count = COALESCE(?, style_count),
        single_quantity = COALESCE(?, single_quantity),
        design_fee = COALESCE(?, design_fee),
        sample_fee = COALESCE(?, sample_fee),
        unit_price = COALESCE(?, unit_price),
        total_quantity = COALESCE(?, total_quantity),
        other_fee = COALESCE(?, other_fee),
        total_amount = COALESCE(?, total_amount),
        remark = COALESCE(?, remark),
        update_time = NOW()
        WHERE id = ?`, [
        r['项目']||null, ipId?String(ipId):null, catId?String(catId):null, supId,
        num(r['打样（天）']), num(r['大货（天）']), num(r['款式']), num(r['单款数量']),
        num(r['设计费']), num(r['打样费']), num(r['单价']), num(r['总数量']),
        num(r['其他费用']), num(r['总价']),
        [r['备注1'],r['备注2']].filter(Boolean).join('; ')||null, id
      ])
      updated++
    } else {
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null
      const catId = r['品类'] ? await getTagId(r['品类'], 'category') : null
      const supId = r['供应商'] ? await getSupplierId(r['供应商'].trim()) : null
      await db.query(`INSERT INTO project (
        project_name, product_name, ip_tag_ids, category_tag_ids, supplier_id,
        sample_cycle, mass_production_cycle, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee, total_amount,
        remark, status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['项目']||null, r['单品'], ipId?String(ipId):null, catId?String(catId):null, supId,
        num(r['打样（天）']), num(r['大货（天）']), num(r['款式']), num(r['单款数量']),
        num(r['设计费']), num(r['打样费']), num(r['单价']), num(r['总数量']),
        num(r['其他费用']), num(r['总价']),
        [r['备注1'],r['备注2']].filter(Boolean).join('; ')||null
      ])
      created++
    }
  }
  console.log(`  Updated: ${updated}, Created: ${created}`)

  const [p] = await db.query('SELECT COUNT(*) as c FROM project WHERE is_delete = 0')
  const [s] = await db.query('SELECT COUNT(*) as c FROM supplier WHERE is_delete = 0')
  console.log(`\n=== 完成: ${p.c} 项目, ${s.c} 供应商 ===`)
}

main().catch(e => { console.error(e); process.exit(1) })