/**
 * 供应商库严格导入：仅从 Sheet3 读取，清空旧数据
 */
const XLSX = require('xlsx')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const db = require('../src/config/database')
function num(v) { return v ? Number(v) : null }

async function main() {
  const wb = XLSX.readFile('../2025.4-2026.4周边制作汇总.xlsx')
  const s3 = XLSX.utils.sheet_to_json(wb.Sheets['供应商库'], { defval: '' })

  console.log('Sheet3 rows:', s3.length)
  console.log('Columns:', Object.keys(s3[0]).join(' | '))

  // 清除旧数据
  await db.query('SET FOREIGN_KEY_CHECKS = 0')
  await db.query('UPDATE project SET supplier_id = NULL WHERE is_delete = 0')
  await db.query('TRUNCATE TABLE supplier')
  await db.query('SET FOREIGN_KEY_CHECKS = 1')
  console.log('Cleared old suppliers')

  let ok = 0, fail = 0
  const errors = []

  for (const r of s3) {
    try {
      if (!r['供应商']) continue

      const contractMap = { '单次合同': 'project', '无合同储备': 'none', '三方合同': 'third_party' }
      const scoreRaw = num(r['主观评分'])
      // 820 明显是录入错误，按 82 处理
      const score = scoreRaw > 100 ? Math.round(scoreRaw / 10) : scoreRaw
      // 保留原始百分制评分
      const rating = score || null

      await db.query(`INSERT INTO supplier (
        supplier_name, supplier_short_name,
        contact_person, contact_phone, contact_email,
        contract_type, rating, remark, cooperation_status,
        create_time, update_time, is_delete
      ) VALUES (?,?,?,?,?,?,?,?,'active',NOW(),NOW(),0)`, [
        r['供应商'].trim(),
        r['简写'] || null,
        r['联系人'] || null,
        r['联系电话'] || null,
        r['联系邮箱'] || null,
        contractMap[r['单次合同']] || 'project',
        rating,
        r['备注'] || null
      ])
      ok++
    } catch (e) { fail++; errors.push(r['供应商'] + ': ' + e.message) }
  }

  console.log(`OK: ${ok}, Fail: ${fail}`)
  if (errors.length > 0) console.log('Errors:', errors.slice(0, 5).join('\n'))

  const [c] = await db.query('SELECT COUNT(*) as cnt FROM supplier WHERE is_delete=0')
  console.log(`Total suppliers: ${c.cnt}`)
}

main().catch(e => { console.error(e); process.exit(1) })