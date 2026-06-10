/**
 * 最终导入：国服=Sheet2+Sheet1匹配 / 非国服=Sheet1单独
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

const TC = {}
async function getTagId(n, t) {
  if (!n) return null; const k = t+':'+n; if (TC[k]) return TC[k]
  const e = await db.query('SELECT id FROM tag WHERE tag_name=? AND tag_type=? AND is_delete=0', [n,t])
  if (e.length>0) { TC[k]=e[0].id; return e[0].id }
  const r = await db.query('INSERT INTO tag (tag_name,tag_type,sort,status,create_time,update_time,is_delete) VALUES (?,?,99,1,NOW(),NOW(),0)', [n,t])
  TC[k]=r.insertId; return r.insertId
}

async function main() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const s1 = XLSX.utils.sheet_to_json(wb.Sheets['项目及人天统计'], { defval: '' })
  const s2 = XLSX.utils.sheet_to_json(wb.Sheets['周边价格登记（仅国服）'], { defval: '' })

  // 从 Sheet3 建立简写→全名映射
  const s3 = XLSX.utils.sheet_to_json(wb.Sheets['供应商库'], { defval: '' })
  const shortToFull = {}
  for (const r of s3) {
    if (r['简写'] && r['供应商']) shortToFull[r['简写'].trim()] = r['供应商'].trim()
    if (r['供应商']) shortToFull[r['供应商'].trim()] = r['供应商'].trim()
  }
  console.log('Supplier map:', Object.keys(shortToFull).length, 'entries')

  // 增强版 getSupplierId（不自动创建，找不到就 null）
  const SC = {}
  async function getSupId(name) {
    if (!name) return null
    const nn = name.trim()
    // 处理多个供应商的情况（如 "大玥熊, 漫品味"），取第一个
    const first = nn.split(',')[0].trim()
    const fullName = shortToFull[first] || shortToFull[nn] || nn
    if (SC[fullName]) return SC[fullName]
    // 先按全名查
    let e = await db.query('SELECT id FROM supplier WHERE supplier_name=? AND is_delete=0', [fullName])
    if (e.length > 0) { SC[fullName] = e[0].id; return e[0].id }
    // 再按简写查
    e = await db.query('SELECT id FROM supplier WHERE supplier_short_name=? AND is_delete=0', [first])
    if (e.length > 0) { SC[fullName] = e[0].id; return e[0].id }
    // 模糊匹配
    e = await db.query('SELECT id FROM supplier WHERE supplier_name LIKE ? AND is_delete=0', ['%'+first+'%'])
    if (e.length > 0) { SC[fullName] = e[0].id; return e[0].id }
    // 找不到就算了，不创建
    return null
  }

  // 按 (IP, 供应商) 建立 Sheet1 索引
  const s1ByKey = {}
  const s1ByName = {}
  for (const r of s1) {
    if (!r['文本']) continue
    const key = (r['IP']||'') + '|||' + (r['供应商']||'')
    if (!s1ByKey[key]) s1ByKey[key] = r
    s1ByName[r['文本']] = r
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 0')
  await db.query('TRUNCATE TABLE project')
  await db.query('SET FOREIGN_KEY_CHECKS = 1')
  console.log('Cleared')

  let guofu = 0, nonguofu = 0, fail = 0

  // === 国服：Sheet2 为主，匹配 Sheet1 项目信息 ===
  for (const r2 of s2) {
    try {
      if (!r2['单品']) continue
      const matchKey = (r2['IP']||'') + '|||' + (r2['供应商']||'')
      const s1r = s1ByKey[matchKey] || null

      const ipId = r2['IP'] ? await getTagId(r2['IP'], 'ip') : null
      const catId = r2['品类'] ? await getTagId(r2['品类'], 'category') : null
      const supId = r2['供应商'] ? await getSupId(r2['供应商']) : null

      await db.query(`INSERT INTO project (
        project_name, ip_tag_ids, region, category_tag_ids,
        product_name, style_count, single_quantity, total_quantity,
        unit_price, total_amount, supplier_id,
        sample_cycle, mass_production_cycle, sample_fee, design_fee, other_fee,
        project_start_date, project_end_date, project_leader, requester,
        remark, effect_images, purchase_order_no,
        status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r2['项目'] || r2['单品'],  // project_name
        ipId ? String(ipId) : null,
        '国服',  // Sheet2 是「仅国服」，强制国服
        catId ? String(catId) : null,
        r2['单品'],
        num(r2['款式']), num(r2['单款数量']), num(r2['总数量']),
        num(r2['单价']), num(r2['总价']),
        supId,
        num(r2['打样（天）']), num(r2['大货（天）']),
        num(r2['打样费']), num(r2['设计费']), num(r2['其他费用']),
        s1r ? excelDateToISO(s1r['开始日期']) : null,
        s1r ? excelDateToISO(s1r['结束日期']) : null,
        s1r ? (s1r['主要负责人']||'').split(',')[0].trim()||null : null,
        s1r ? s1r['需求人'] : null,
        [r2['备注1'], r2['备注2']].filter(Boolean).join('; ') || null,
        r2['图片'] || null,
        s1r ? s1r['相关请购需求单'] : null
      ])
      guofu++
    } catch (e) { fail++; if (fail<=3) console.error('Error:', r2['单品'], e.message) }
  }

  // === 非国服：Sheet1 中区服≠国服的项目 ===
  for (const r1 of s1) {
    try {
      if (!r1['文本']) continue
      if (r1['区服'] === '国服') continue  // 国服已在上面导入

      const ipId = r1['IP'] ? await getTagId(r1['IP'], 'ip') : null
      const supId = r1['供应商'] ? await getSupId(r1['供应商']) : null

      await db.query(`INSERT INTO project (
        project_name, ip_tag_ids, region,
        total_amount, supplier_id,
        project_start_date, project_end_date, project_leader, requester,
        purchase_order_no, remark,
        status, create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'completed',NOW(),NOW(),0)`, [
        r1['文本'],
        ipId ? String(ipId) : null,
        r1['区服'],
        num(r1['项目总价']),
        supId,
        excelDateToISO(r1['开始日期']),
        excelDateToISO(r1['结束日期']),
        (r1['主要负责人']||'').split(',')[0].trim()||null,
        r1['需求人'] || null,
        r1['相关请购需求单'] || null,
        r1['备注'] || null
      ])
      nonguofu++
    } catch (e) { fail++; if (fail<=3) console.error('Error:', r1['文本'], e.message) }
  }

  console.log(`国服(23字段): ${guofu} | 非国服(项目级): ${nonguofu} | Fail: ${fail}`)
  const [p] = await db.query('SELECT COUNT(*) as c FROM project WHERE is_delete = 0')
  console.log(`Total: ${p.c}`)
}

main().catch(e => { console.error(e); process.exit(1) })