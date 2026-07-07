/**
 * 预填设计/生产注意种子内容（16 条）
 * 幂等：以 title 去重，已存在则跳过。
 * 用法：node database/seed_design_notes.js
 */
const path = require('path')
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') })
const db = require('../backend/src/config/database')

const SEEDS = [
  // ===== 设计注意 =====
  { title: '出血与安全区', note_type: 'design', severity: 'important', stage: 'design', category: '纸制品', craft: '印刷',
    content: '印刷品未留出血或文字距裁切线过近，裁切时出现露白或切掉文字。',
    correct_practice: '出血统一留 3mm；文字与重要元素距裁切线 ≥3mm；出稿前检查安全区，关键内容不跨出血线。' },
  { title: '专色与品牌色', note_type: 'design', severity: 'important', stage: 'design,mass', category: '全品类', craft: '专色印刷',
    content: '品牌色/LOGO 用四色叠印，批次间偏色明显，与品牌视觉规范不符。',
    correct_practice: '品牌色指定专色（潘通色号）；深底白字垫白墨；打样对照潘通色卡确认后再批量。' },
  { title: '最小线宽与字号', note_type: 'design', severity: 'fatal', stage: 'design,sample', category: '全品类', craft: '丝印/烫金',
    content: '丝印/烫金线条过细或字号过小，成品断线、糊字、缺笔。',
    correct_practice: '丝印/烫金线宽 ≥0.3mm；最小字号视工艺咨询工厂；过细文字改凸印或 UV 工艺。' },
  { title: '异形模切拐角', note_type: 'design', severity: 'important', stage: 'design', category: '纸制品', craft: '模切',
    content: '异形刀模拐角过尖（<90°），模切后纸张撕裂、边缘毛糙。',
    correct_practice: '拐角尽量 ≥90° 或做圆角（R≥2mm）；尖角处加圆角过渡；与刀模厂确认拐角工艺。' },
  { title: 'CMYK 与屏幕色差', note_type: 'design', severity: 'important', stage: 'design,sample', category: '全品类', craft: '四色印刷',
    content: '按 RGB 屏幕效果定稿，转 CMYK 后深色/荧光色变暗，成品与预期偏差大。',
    correct_practice: '设计文件统一用 CMYK 模式；深色/荧光色必须打样确认，不能只看屏幕；必要时用专色补色。' },
  { title: '材质与工艺匹配', note_type: 'design', severity: 'fatal', stage: 'design,sample', category: '特殊材质', craft: '烫金/印刷',
    content: '珠光纸大面积深色吸墨不均；镭射纸烫金温度过高糊版；亚克力热弯未预留回弹量。',
    correct_practice: '珠光纸慎用大面积深色，改局部色块；镭射纸烫金降温试压；亚克力热弯按材质预留回弹余量。' },
  { title: '双面正反面对齐', note_type: 'design', severity: 'suggestion', stage: 'design,mass', category: '双面印刷', craft: '双面印',
    content: '双面印刷/模切未标天地线方向，正反面错位、图案不对齐。',
    correct_practice: '文件标注天地线与咬口方向；模切件图纹与刀模方向一致；打样核对正反套准。' },
  { title: 'IP 元素安全区与授权', note_type: 'design', severity: 'fatal', stage: 'design', category: 'IP周边', craft: '全工艺',
    content: '授权素材被二次修改比例、裁切关键元素，或漏署名，导致授权方拒收或侵权。',
    correct_practice: '严格按授权素材原图使用，不可拉伸/裁切主体；保留作者署名区；超出授权范围需重新申请。' },

  // ===== 生产注意 =====
  { title: '打样与大货差异', note_type: 'production', severity: 'important', stage: 'sample,mass', category: '全品类', craft: '全工艺',
    content: '打样单件精修与大货批量存在公差，未约定允差导致大货到货与打样不符。',
    correct_practice: '下单前书面约定色差 ΔE 与尺寸公差范围；大货首件对照打样签字确认后再批量。' },
  { title: '色差允收标准', note_type: 'production', severity: 'important', stage: 'mass', category: '印刷品', craft: '四色印刷',
    content: '大货批次间色差未抽检，整批偏色流入下道工序。',
    correct_practice: '按批次抽检色差，ΔE≤3 为合格；超差批次拒收或返工；留存打样作比对基准。' },
  { title: '数量损耗加放', note_type: 'production', severity: 'important', stage: 'mass', category: '全品类', craft: '印刷/模切',
    content: '按净数量下单未加损耗，不良与裁切损耗导致交货不够数。',
    correct_practice: '印刷加放 5%~10%，异形/特殊工艺 10%~15%；下单量 = 净数量 + 损耗，提前与客户说明。' },
  { title: '特殊工艺排产周期', note_type: 'production', severity: 'important', stage: 'sample,mass', category: '全品类', craft: '烫金/击凸/UV',
    content: '烫金/击凸/UV 需排队排产，旺季未提前下单导致延期。',
    correct_practice: '特殊工艺提前 7~10 天下单；旺季预留排产缓冲；与工厂确认交期后再回复客户。' },
  { title: '来料入厂检验', note_type: 'production', severity: 'fatal', stage: 'mass', category: '全品类', craft: '全工艺',
    content: '来料（纸张克重/厚度、膜厚、色牢度）未抽检直接上线，不良料流入成品。',
    correct_practice: '入厂按批次抽检克重/厚度/色牢度，不合格批次拒收并记录；关键料件首件确认再批量上线。' },
  { title: '包装防刮防压', note_type: 'production', severity: 'important', stage: 'package', category: '异形/易刮花件', craft: '包装',
    content: '异形件/镭射件直接堆叠运输，互相刮花、磨损。',
    correct_practice: '异形/易刮花件用隔板 + 气泡袋单件隔离；外箱标毛重与向上标志，避免重压与倒置。' },
  { title: '大货首件确认', note_type: 'production', severity: 'fatal', stage: 'mass', category: '全品类', craft: '全工艺',
    content: '大货开机未做首件确认直接批量，整批错误报废。',
    correct_practice: '开机首件由质检/项目负责人签字确认后再批量；首件留存至批次交付完毕。' },
  { title: 'IP 授权合规与包装标识', note_type: 'production', severity: 'fatal', stage: 'mass,package', category: 'IP周边', craft: '全工艺',
    content: 'IP 元素超出授权范围/期限使用，或包装漏印授权信息，导致侵权下架。',
    correct_practice: '生产前核验授权范围与期限；包装按授权方要求印授权信息与标识；超期/超范围需重新申请授权。' }
]

async function main() {
  // 取 admin 用户 id 作为创建人
  const [admin] = await db.query("SELECT id FROM sys_user WHERE username='admin' LIMIT 1")
  const uid = admin?.id || null

  let inserted = 0, skipped = 0
  for (const s of SEEDS) {
    // 幂等：标题相同且未删除则跳过
    const [exist] = await db.query('SELECT id FROM design_note WHERE title=? AND is_delete=0', [s.title])
    if (exist) { skipped++; continue }
    await db.query(
      'INSERT INTO design_note (title, content, correct_practice, note_type, severity, stage, category, craft, create_user_id, create_time, update_time, is_delete) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW(),0)',
      [s.title, s.content, s.correct_practice, s.note_type, s.severity, s.stage, s.category, s.craft, uid]
    )
    inserted++
  }
  console.log(`种子完成：新增 ${inserted} 条，跳过 ${skipped} 条（已存在）`)
  // 统计
  const cnt = await db.query('SELECT note_type, COUNT(*) n FROM design_note WHERE is_delete=0 GROUP BY note_type')
  console.log('当前各类型数量:', JSON.stringify(cnt))
  await db.closePool()
}
main().catch(e => { console.error('ERR', e); process.exit(1) })
