/**
 * 全量接口测试脚本
 * 覆盖所有 API 的增删改查，虚构数据测试后自动清理
 * 用法: node api_test.js
 */
require('../backend/node_modules/dotenv').config({ path: '../backend/.env' })
const BASE = 'http://localhost:3000/api'
let TOKEN = ''
let passCount = 0, failCount = 0
const createdIds = { project: null, priceRecord: null, inspiration: null, supplier: null, designNote: null, tag: null, user: null }

function log(ok, name, detail = '') {
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} ${name}${detail ? ' → ' + detail : ''}`)
  if (ok) passCount++; else failCount++
}

async function req(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const resp = await fetch(`${BASE}${path}`, opts)
  const text = await resp.text()
  try { return { status: resp.status, data: JSON.parse(text) } }
  catch { return { status: resp.status, data: { raw: text } } }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  周边可视化系统 — 全量接口测试')
  console.log('═══════════════════════════════════════════\n')

  // ========== 1. 认证模块 ==========
  console.log('── 1. 认证模块 ──')

  // 1.1 登录(admin)
  let r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' })
  TOKEN = r.data?.data?.token || ''
  log(r.status === 200 && TOKEN, 'POST /auth/login (admin)', `status=${r.status}`)

  // 1.2 登录(错误密码)
  r = await req('POST', '/auth/login', { username: 'admin', password: 'wrong' })
  log(r.status === 401, 'POST /auth/login (错误密码应401)', `status=${r.status}`)

  // 1.3 获取当前用户
  r = await req('GET', '/auth/current')
  log(r.status === 200, 'GET /auth/current', `status=${r.status}`)

  // 1.4 获取菜单权限
  r = await req('GET', '/auth/menus')
  log(r.status === 200, 'GET /auth/menus', `status=${r.status}`)

  // 1.5 获取按钮权限
  r = await req('GET', '/auth/permissions')
  log(r.status === 200, 'GET /auth/permissions', `status=${r.status}`)

  // 1.6 用户列表
  r = await req('GET', '/auth/users?page=1&pageSize=10')
  log(r.status === 200, 'GET /auth/users', `status=${r.status}`)

  // 1.7 无token访问
  const oldToken = TOKEN; TOKEN = ''
  r = await req('GET', '/auth/current')
  log(r.status === 401, 'GET /auth/current (无token应401)', `status=${r.status}`)
  TOKEN = oldToken

  // ========== 2. 标签模块 ==========
  console.log('\n── 2. 标签模块 ──')

  // 2.1 标签列表
  r = await req('GET', '/tags')
  log(r.status === 200, 'GET /tags', `status=${r.status}`)

  // 2.2 按类型获取标签
  r = await req('GET', '/tags?tag_type=ip')
  log(r.status === 200, 'GET /tags?tag_type=ip', `status=${r.status}`)

  // 2.3 标签树
  r = await req('GET', '/tags/tree')
  log(r.status === 200, 'GET /tags/tree', `status=${r.status}`)

  // 2.4 新增标签(虚构)
  r = await req('POST', '/tags', { tag_name: 'TEST_TAG_DELETE_ME', tag_code: 'test_delete', tag_type: 'category', sort: 999 })
  createdIds.tag = r.data?.data?.id || null
  log(r.status === 200 && createdIds.tag, 'POST /tags (新增虚构标签)', `id=${createdIds.tag}`)

  // 2.5 更新标签
  if (createdIds.tag) {
    r = await req('PUT', `/tags/${createdIds.tag}`, { tag_name: 'TEST_TAG_UPDATED' })
    log(r.status === 200, 'PUT /tags/:id (更新标签)', `status=${r.status}`)
  }

  // 2.6 删除标签
  if (createdIds.tag) {
    r = await req('DELETE', `/tags/${createdIds.tag}`)
    log(r.status === 200, 'DELETE /tags/:id (删除虚构标签)', `status=${r.status}`)
  }

  // ========== 3. 项目模块 ==========
  console.log('\n── 3. 项目模块 ──')

  // 3.1 项目列表
  r = await req('GET', '/projects?page=1&pageSize=5')
  log(r.status === 200, 'GET /projects', `status=${r.status}, total=${r.data?.data?.pagination?.total}`)

  // 3.2 项目筛选选项
  r = await req('GET', '/projects/options')
  log(r.status === 200, 'GET /projects/options', `status=${r.status}`)

  // 3.3 新增项目(虚构)
  r = await req('POST', '/projects', {
    product_name: 'TEST_PROJECT_DELETE_ME', project_name: '测试项目',
    project_year: 2026, region: '国服', total_amount: 999.99,
    requester: '测试人', requirement_type: '新需求'
  })
  createdIds.project = r.data?.data?.id || null
  log(r.status === 200 && createdIds.project, 'POST /projects (新增虚构项目)', `id=${createdIds.project}`)

  // 3.4 项目详情
  if (createdIds.project) {
    r = await req('GET', `/projects/${createdIds.project}`)
    log(r.status === 200, 'GET /projects/:id (详情)', `status=${r.status}`)
  }

  // 3.5 更新项目
  if (createdIds.project) {
    r = await req('PUT', `/projects/${createdIds.project}`, { product_name: 'TEST_PROJECT_UPDATED', total_amount: 888.88 })
    log(r.status === 200, 'PUT /projects/:id (更新)', `status=${r.status}`)
  }

  // 3.6 删除项目
  if (createdIds.project) {
    r = await req('DELETE', `/projects/${createdIds.project}`)
    log(r.status === 200, 'DELETE /projects/:id (删除虚构项目)', `status=${r.status}`)
  }

  // ========== 4. 价格记录模块 ==========
  console.log('\n── 4. 价格记录模块 ──')

  // 4.1 价格记录列表
  r = await req('GET', '/price-records?page=1&pageSize=5')
  log(r.status === 200, 'GET /price-records', `status=${r.status}`)

  // 4.2 筛选选项
  r = await req('GET', '/price-records/options')
  log(r.status === 200, 'GET /price-records/options', `status=${r.status}`)

  // 4.3 价格查询
  r = await req('GET', '/price-records/query?keyword=test')
  log(r.status === 200, 'GET /price-records/query', `status=${r.status}`)

  // 4.4 新增价格记录(虚构)
  r = await req('POST', '/price-records', {
    product_name: 'TEST_PRICE_DELETE_ME', category: '纸制品',
    supplier_name: '测试供应商', ip: '无限暖暖',
    unit_price: 9.99, total_quantity: 100, total_price: 999.00
  })
  createdIds.priceRecord = r.data?.data?.id || null
  log(r.status === 200 && createdIds.priceRecord, 'POST /price-records (新增虚构记录)', `id=${createdIds.priceRecord}`)

  // 4.5 详情
  if (createdIds.priceRecord) {
    r = await req('GET', `/price-records/${createdIds.priceRecord}`)
    log(r.status === 200, 'GET /price-records/:id (详情)', `status=${r.status}`)
  }

  // 4.6 更新
  if (createdIds.priceRecord) {
    r = await req('PUT', `/price-records/${createdIds.priceRecord}`, { unit_price: 19.99 })
    log(r.status === 200, 'PUT /price-records/:id (更新)', `status=${r.status}`)
  }

  // 4.7 删除
  if (createdIds.priceRecord) {
    r = await req('DELETE', `/price-records/${createdIds.priceRecord}`)
    log(r.status === 200, 'DELETE /price-records/:id (删除虚构记录)', `status=${r.status}`)
  }

  // ========== 5. 灵感模块 ==========
  console.log('\n── 5. 灵感模块 ──')

  // 5.1 灵感列表
  r = await req('GET', '/inspirations?page=1&pageSize=5')
  log(r.status === 200, 'GET /inspirations', `status=${r.status}`)

  // 5.2 新增灵感(虚构，不传链接避免触发AI分析)
  r = await req('POST', '/inspirations', {
    title: 'TEST_INSPIRATION_DELETE_ME', source_url: 'https://example.com/test',
    inspiration_type: 'peripheral', collection_status: 'uncollected'
  })
  createdIds.inspiration = r.data?.data?.id || null
  log(r.status === 200 && createdIds.inspiration, 'POST /inspirations (新增虚构灵感)', `id=${createdIds.inspiration}`)

  // 5.3 详情
  if (createdIds.inspiration) {
    r = await req('GET', `/inspirations/${createdIds.inspiration}`)
    log(r.status === 200, 'GET /inspirations/:id (详情)', `status=${r.status}`)
  }

  // 5.4 更新详情
  if (createdIds.inspiration) {
    r = await req('PUT', `/inspirations/${createdIds.inspiration}/detail`, { title: 'TEST_INSPIRATION_UPDATED', description: '测试描述' })
    log(r.status === 200, 'PUT /inspirations/:id/detail (更新详情)', `status=${r.status}`)
  }

  // 5.5 删除
  if (createdIds.inspiration) {
    r = await req('DELETE', `/inspirations/${createdIds.inspiration}`)
    log(r.status === 200, 'DELETE /inspirations/:id (删除虚构灵感)', `status=${r.status}`)
  }

  // ========== 6. 供应商模块 ==========
  console.log('\n── 6. 供应商模块 ──')

  // 6.1 列表
  r = await req('GET', '/suppliers?page=1&pageSize=5')
  log(r.status === 200, 'GET /suppliers', `status=${r.status}`)

  // 6.2 供应商看板
  r = await req('GET', '/suppliers/dashboard')
  log(r.status === 200, 'GET /suppliers/dashboard', `status=${r.status}`)

  // 6.3 新增供应商(虚构)
  r = await req('POST', '/suppliers', {
    supplier_name: 'TEST_SUPPLIER_1783070635237', supplier_short_name: '测试',
    contact_person: '测试人', contact_phone: '13800000000'
  })
  createdIds.supplier = r.data?.data?.id || null
  log(r.status === 200 && createdIds.supplier, 'POST /suppliers (新增虚构供应商)', `id=${createdIds.supplier}`)

  // 6.4 详情
  if (createdIds.supplier) {
    r = await req('GET', `/suppliers/${createdIds.supplier}`)
    log(r.status === 200, 'GET /suppliers/:id (详情)', `status=${r.status}`)
  }

  // 6.5 更新
  if (createdIds.supplier) {
    r = await req('PUT', `/suppliers/${createdIds.supplier}`, { contact_person: '测试人2' })
    log(r.status === 200, 'PUT /suppliers/:id (更新)', `status=${r.status}`)
  }

  // 6.6 删除
  if (createdIds.supplier) {
    r = await req('DELETE', `/suppliers/${createdIds.supplier}`)
    log(r.status === 200, 'DELETE /suppliers/:id (删除虚构供应商)', `status=${r.status}`)
  }

  // ========== 7. 设计注意模块 ==========
  console.log('\n── 7. 设计注意模块 ──')

  // 7.1 列表
  r = await req('GET', '/design-notes?page=1&pageSize=5')
  log(r.status === 200, 'GET /design-notes', `status=${r.status}`)

  // 7.2 新增(虚构)
  r = await req('POST', '/design-notes', {
    title: 'TEST_NOTE_DELETE_ME', content: '测试内容', note_type: 'design'
  })
  createdIds.designNote = r.data?.data?.id || null
  log(r.status === 200 && createdIds.designNote, 'POST /design-notes (新增虚构记录)', `id=${createdIds.designNote}`)

  // 7.3 详情
  if (createdIds.designNote) {
    r = await req('GET', `/design-notes/${createdIds.designNote}`)
    log(r.status === 200, 'GET /design-notes/:id (详情)', `status=${r.status}`)
  }

  // 7.4 更新
  if (createdIds.designNote) {
    r = await req('PUT', `/design-notes/${createdIds.designNote}`, { title: 'TEST_NOTE_UPDATED' })
    log(r.status === 200, 'PUT /design-notes/:id (更新)', `status=${r.status}`)
  }

  // 7.5 删除
  if (createdIds.designNote) {
    r = await req('DELETE', `/design-notes/${createdIds.designNote}`)
    log(r.status === 200, 'DELETE /design-notes/:id (删除虚构记录)', `status=${r.status}`)
  }

  // ========== 8. 搜索模块 ==========
  console.log('\n── 8. 搜索模块 ──')

  r = await req('GET', '/search?q=烫金')
  log(r.status === 200, 'GET /search?q=烫金', `status=${r.status}, groups=${r.data?.data?.groups?.length}`)

  r = await req('GET', '/search?q=')
  log(r.status === 400, 'GET /search?q= (空关键词应400)', `status=${r.status}`)

  // ========== 9. 统计模块 ==========
  console.log('\n── 9. 统计模块 ──')

  r = await req('GET', '/statistics/dashboard')
  log(r.status === 200, 'GET /statistics/dashboard', `status=${r.status}`)

  // ========== 10. 配置模块 ==========
  console.log('\n── 10. 配置模块 ──')

  // 10.1 获取单个配置
  r = await req('GET', '/settings/visitor_hot_words')
  log(r.status === 200, 'GET /settings/:key', `status=${r.status}`)

  // 10.2 获取所有配置
  r = await req('GET', '/settings')
  log(r.status === 200, 'GET /settings', `status=${r.status}`)

  // ========== 11. 日志模块 ==========
  console.log('\n── 11. 日志模块 ──')

  r = await req('GET', '/logs?page=1&pageSize=5')
  log(r.status === 200, 'GET /logs', `status=${r.status}`)

  r = await req('GET', '/logs/modules')
  log(r.status === 200, 'GET /logs/modules', `status=${r.status}`)

  // ========== 12. 流量监控 ==========
  console.log('\n── 12. 流量监控 ──')

  r = await req('GET', '/traffic-stats')
  log(r.status === 200, 'GET /traffic-stats', `status=${r.status}`)

  // ========== 13. 权限越权测试 ==========
  console.log('\n── 13. 权限越权测试 ──')

  // 用viewer登录
  r = await req('POST', '/auth/login', { username: 'viewer', password: 'viewer123' })
  const viewerToken = r.data?.data?.token || ''
  log(r.status === 200 && viewerToken, 'POST /auth/login (viewer)', `status=${r.status}`)

  if (viewerToken) {
    const oldT = TOKEN; TOKEN = viewerToken
    // viewer尝试访问管理员接口
    r = await req('GET', '/settings')
    log(r.status === 403, 'viewer GET /settings (应403)', `status=${r.status}`)

    r = await req('GET', '/logs')
    log(r.status === 403, 'viewer GET /logs (应403)', `status=${r.status}`)

    r = await req('GET', '/traffic-stats')
    log(r.status === 403, 'viewer GET /traffic-stats (应403)', `status=${r.status}`)

    r = await req('GET', '/auth/users')
    log(r.status === 403, 'viewer GET /auth/users (应403)', `status=${r.status}`)

    // viewer尝试写操作
    r = await req('POST', '/tags', { tag_name: 'HACK', tag_type: 'ip' })
    log(r.status === 403, 'viewer POST /tags (应403)', `status=${r.status}`)

    r = await req('DELETE', '/projects/1')
    log(r.status === 403, 'viewer DELETE /projects/1 (应403)', `status=${r.status}`)

    // viewer可以读
    r = await req('GET', '/projects?page=1&pageSize=1')
    log(r.status === 200, 'viewer GET /projects (应200)', `status=${r.status}`)

    r = await req('GET', '/search?q=test')
    log(r.status === 200, 'viewer GET /search (应200)', `status=${r.status}`)

    TOKEN = oldT
  }

  // ========== 14. 清理验证 ==========
  console.log('\n── 14. 清理验证 ──')

  // 确认虚构数据都已删除
  for (const [type, id] of Object.entries(createdIds)) {
    if (!id) continue
    const pathMap = { project: `/projects/${id}`, priceRecord: `/price-records/${id}`, inspiration: `/inspirations/${id}`, supplier: `/suppliers/${id}`, designNote: `/design-notes/${id}`, tag: `/tags/${id}` }
    r = await req('GET', pathMap[type] || '')
    log(r.status === 404, `清理验证: ${type} #${id} (应404)`, `status=${r.status}`)
  }

  // ========== 汇总 ==========
  console.log('\n═══════════════════════════════════════════')
  console.log(`  测试完成: ✅ ${passCount} 通过  ❌ ${failCount} 失败`)
  console.log(`  虚构数据: ${Object.values(createdIds).filter(Boolean).length} 条已全部清理`)
  console.log('═══════════════════════════════════════════')

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(e => { console.error('测试脚本异常:', e); process.exit(1) })
