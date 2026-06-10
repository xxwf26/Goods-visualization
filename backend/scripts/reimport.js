/**
 * 完整重导：删除旧导入数据 → 按 Excel 字段严格重新导入
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

async function getSupplierId(fullName) {
  if (!fullName) return null
  const e = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [fullName])
  if (e.length > 0) return e[0].id
  const r = await db.query("INSERT INTO supplier (supplier_name, cooperation_status, create_time, update_time, is_delete) VALUES (?,'active',NOW(),NOW(),0)", [fullName])
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

  // === Sheet 1: 项目及人天统计 ===
  console.log('=== Sheet 1: 项目及人天统计 ===')
  const s1 = XLSX.utils.sheet_to_json(wb.Sheets['项目及人天统计'], { defval: '' })

  // 删除旧的 Sheet 1 数据（通过项目名称匹配）
  const names1 = s1.map(r => r['文本']).filter(Boolean)
  if (names1.length > 0) {
    const placeholders = names1.map(() => '?').join(',')
    await db.query(`DELETE FROM project WHERE project_name IN (${placeholders}) AND is_delete = 0`, names1)
  }
  console.log(`  Deleted old records`)

  let ok = 0, fail = 0
  for (const r of s1) {
    try {
      if (!r['文本']) continue
      const supName = r['供应商']?.trim()
      const supId = supName ? await getSupplierId(supName) : null
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null

      await db.query(`INSERT INTO project (
        project_name, project_year, ip_tag_ids, region,
        scene_name, purchase_order_no, supplier_id,
        unit_price, total_amount, man_days, requester,
        project_leader, quotation_file, file_storage_path, parent_record,
        project_start_date, project_end_date, remark,
        status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['文本'], num(r['年份']),
        ipId ? String(ipId) : null,
        r['区服'] || null,
        r['需求种类'] || null,
        r['相关请购需求单'] || null,
        supId,
        null, // unit_price - not in Sheet 1
        num(r['项目总价']),
        num(r['投入人天']),
        r['需求人'] || null,
        (r['主要负责人'] || '').split(',')[0].trim() || null,
        r['报价单'] || null,
        r['文件存储地址'] || null,
        r['父记录'] || null,
        excelDateToISO(r['开始日期']),
        excelDateToISO(r['结束日期']),
        r['备注'] || null
      ])
      ok++
    } catch (e) { fail++; if (fail <= 2) console.error('  Error:', r['文本'], e.message) }
  }
  console.log(`  OK: ${ok}, Fail: ${fail}`)

  // === Sheet 2: 周边价格登记 ===
  console.log('\n=== Sheet 2: 周边价格登记 ===')
  const s2 = XLSX.utils.sheet_to_json(wb.Sheets['周边价格登记（仅国服）'], { defval: '' })

  // 删除旧数据
  const names2 = s2.map(r => r['单品']).filter(Boolean)
  for (const name of names2) {
    await db.query('DELETE FROM project WHERE product_name = ? AND man_days IS NULL AND is_delete = 0', [name])
  }
  console.log(`  Deleted old records`)

  ok = 0; fail = 0
  for (const r of s2) {
    try {
      if (!r['单品']) continue
      const supId = r['供应商'] ? await getSupplierId(r['供应商'].trim()) : null
      const ipId = r['IP'] ? await getTagId(r['IP'], 'ip') : null
      const catId = r['品类'] ? await getTagId(r['品类'], 'category') : null

      await db.query(`INSERT INTO project (
        project_name, product_name, ip_tag_ids, category_tag_ids, supplier_id,
        sample_cycle, mass_production_cycle, style_count, single_quantity,
        design_fee, sample_fee, unit_price, total_quantity, other_fee, total_amount,
        remark, status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r['项目'] || null,
        r['单品'],
        ipId ? String(ipId) : null,
        catId ? String(catId) : null,
        supId,
        num(r['打样（天）']), num(r['大货（天）']),
        num(r['款式']), num(r['单款数量']),
        num(r['设计费']), num(r['打样费']),
        num(r['单价']), num(r['总数量']),
        num(r['其他费用']), num(r['总价']),
        [r['备注1'], r['备注2']].filter(Boolean).join('; ') || null
      ])
      ok++
    } catch (e) { fail++; if (fail <= 2) console.error('  Error:', r['单品'], e.message) }
  }
  console.log(`  OK: ${ok}, Fail: ${fail}`)

  // === Sheet 3: 供应商库 ===
  console.log('\n=== Sheet 3: 供应商库 ===')
  const s3 = XLSX.utils.sheet_to_json(wb.Sheets['供应商库'], { defval: '' })
  ok = 0; fail = 0
  for (const r of s3) {
    try {
      if (!r['供应商']) continue
      const existing = await db.query('SELECT id FROM supplier WHERE supplier_name = ? AND is_delete = 0', [r['供应商']])
      if (existing.length > 0) {
        await db.query(`UPDATE supplier SET
          supplier_short_name=COALESCE(?,supplier_short_name), contact_person=COALESCE(?,contact_person),
          contact_phone=COALESCE(?,contact_phone), contact_email=COALESCE(?,contact_email),
          contract_type=COALESCE(?,contract_type), rating=COALESCE(?,rating),
          remark=COALESCE(?,remark), cooperation_status='active', update_time=NOW()
          WHERE id=?`, [r['简写']||null, r['联系人']||null, r['联系电话']||null,
          r['联系邮箱']||null, r['单次合同']==='框架合同'?'framework':'project',
          num(r['主观评分'])?Math.round(num(r['主观评分'])/20):null, r['备注']||null, existing[0].id])
      } else {
        await db.query(`INSERT INTO supplier (supplier_name,supplier_short_name,contact_person,contact_phone,contact_email,contract_type,rating,remark,cooperation_status,create_time,update_time,is_delete)
          VALUES (?,?,?,?,?,?,?,?,'active',NOW(),NOW(),0)`,
          [r['供应商'],r['简写']||null,r['联系人']||null,r['联系电话']||null,r['联系邮箱']||null,
           r['单次合同']==='框架合同'?'framework':'project', num(r['主观评分'])?Math.round(num(r['主观评分'])/20):null, r['备注']||null])
      }
      ok++
    } catch (e) { fail++ }
  }
  console.log(`  OK: ${ok}, Fail: ${fail}`)

  const [p] = await db.query('SELECT COUNT(*) as c FROM project WHERE is_delete = 0')
  const [s] = await db.query('SELECT COUNT(*) as c FROM supplier WHERE is_delete = 0')
  console.log(`\n=== 完成 ===`)
  console.log(`项目: ${p.c} | 供应商: ${s.c}`)
}

main().catch(e => { console.error(e); process.exit(1) })