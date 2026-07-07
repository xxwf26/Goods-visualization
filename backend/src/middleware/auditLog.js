/**
 * 操作审计中间件
 * 对写操作（POST/PUT/DELETE）在响应完成后异步记录到 log 表。
 * 设计原则：不阻塞请求、不因日志失败影响主流程（fire-and-forget）。
 * 回撤支持：PUT/DELETE 操作前捕获整行 before_data，POST 记录创建的 resource_id，
 *           供 POST /api/logs/:id/undo 做逆操作还原。
 */
const db = require('../config/database')

// URL 前缀 -> 模块名
const MODULE_MAP = [
  { test: /^\/api\/projects/, name: '历史项目' },
  { test: /^\/api\/suppliers/, name: '供应商' },
  { test: /^\/api\/inspirations/, name: '灵感库' },
  { test: /^\/api\/inspiration-folders/, name: '灵感收藏夹' },
  { test: /^\/api\/price-records/, name: '价格记录' },
  { test: /^\/api\/tags/, name: '标签' },
  { test: /^\/api\/design-notes/, name: '设计注意' },
  { test: /^\/api\/import/, name: '批量导入' },
  { test: /^\/api\/upload/, name: '文件上传' },
  { test: /^\/api\/auth\/users/, name: '用户管理' },
  { test: /^\/api\/auth/, name: '账号' }
]

// 资源路由 -> 表名（白名单，用于回撤捕获 before_data 与定位资源）
// 仅这些表支持回撤；表名硬编码不入库用户输入，防 SQL 注入
const RESOURCE_TABLES = [
  { test: /^\/api\/projects\/(\d+)/, table: 'project' },
  { test: /^\/api\/price-records\/(\d+)/, table: 'price_record' },
  { test: /^\/api\/inspirations\/(\d+)/, table: 'inspiration' },
  { test: /^\/api\/design-notes\/(\d+)/, table: 'design_note' },
  { test: /^\/api\/suppliers\/(\d+)/, table: 'supplier' },
  { test: /^\/api\/tags\/(\d+)/, table: 'tag' }
]

// POST 创建所属表（用于回撤时软删新建记录）
const POST_RESOURCE_TABLE = [
  { test: /^\/api\/projects\/?$/, table: 'project' },
  { test: /^\/api\/price-records\/?$/, table: 'price_record' },
  { test: /^\/api\/inspirations\/?$/, table: 'inspiration' },
  { test: /^\/api\/design-notes\/?$/, table: 'design_note' },
  { test: /^\/api\/suppliers\/?$/, table: 'supplier' },
  { test: /^\/api\/tags\/?$/, table: 'tag' }
]

function resolveModule(url) {
  const hit = MODULE_MAP.find(m => m.test.test(url))
  return hit ? hit.name : '其他'
}

function matchResource(url) {
  for (const r of RESOURCE_TABLES) {
    const m = url.match(r.test)
    if (m) return { table: r.table, id: parseInt(m[1], 10) }
  }
  return null
}

function matchPostResource(url) {
  const hit = POST_RESOURCE_TABLE.find(r => r.test.test(url))
  return hit ? hit.table : null
}

// 根据方法 + 路径推断操作类型
function resolveOperation(method, url) {
  if (/\/import$/.test(url)) return '批量导入'
  if (/\/evaluate$/.test(url)) return '评价'
  if (/\/collect$/.test(url)) return '收藏'
  if (/\/uncollect$/.test(url)) return '取消收藏'
  if (method === 'POST') return '新增'
  if (method === 'PUT' || method === 'PATCH') return '修改'
  if (method === 'DELETE') return '删除'
  return method
}

// 清洗请求参数：去敏感字段、截断超长（如 base64 图片）
function sanitizeParams(body) {
  if (!body || typeof body !== 'object') return null
  try {
    const clone = { ...body }
    for (const k of Object.keys(clone)) {
      if (/password|token|secret/i.test(k)) {
        clone[k] = '***'
      } else if (typeof clone[k] === 'string' && clone[k].length > 500) {
        clone[k] = `[len:${clone[k].length}]`
      }
    }
    let s = JSON.stringify(clone)
    if (s.length > 2000) s = s.slice(0, 2000) + '...'
    return s
  } catch {
    return null
  }
}

const auditLog = async (req, res, next) => {
  const method = req.method
  // 只审计写操作
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next()
  }
  // 登录接口不记录
  if (req.originalUrl.startsWith('/api/auth/login')) {
    return next()
  }

  // 非数据写入的 POST 接口不记录
  const SKIP_URLS = [
    '/api/search/recommend',
    '/api/inspirations/fetch-meta',
    '/api/inspirations/check-links',
    '/api/upload/image',
    '/api/upload/images',
    '/api/upload/base64',
  ]
  const urlPath = req.originalUrl.split('?')[0]
  if (SKIP_URLS.some(u => urlPath === u) || /\/api\/inspirations\/\d+\/(check-link|analyze|refresh-snapshot)$/.test(urlPath) || /\/api\/logs\/\d+\/undo$/.test(urlPath)) {
    return next()
  }

  // 捕获响应体
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    res.locals._auditBody = body
    return originalJson(body)
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 50)
  const userAgent = (req.headers['user-agent'] || '').slice(0, 500)
  const userId = req.user?.id || null
  const username = req.user?.username || null

  // 回撤支持：PUT/DELETE 操作前捕获整行 before_data（在控制器修改前 SELECT）
  if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    const resInfo = matchResource(urlPath)
    if (resInfo) {
      try {
        const [row] = await db.query(
          `SELECT * FROM \`${resInfo.table}\` WHERE id = ? AND is_delete = 0`,
          [resInfo.id]
        )
        if (row) {
          res.locals._beforeData = JSON.stringify(row)
          res.locals._resourceTable = resInfo.table
          res.locals._resourceId = resInfo.id
        }
      } catch { /* 捕获失败不影响主流程 */ }
    }
  }
  // POST 的资源表预记录（resource_id 在响应后从 body.data.id 取）
  if (method === 'POST') {
    res.locals._resourceTable = matchPostResource(urlPath) || null
  }

  res.on('finish', () => {
    setImmediate(async () => {
      try {
        const url = req.originalUrl.split('?')[0]
        const body = res.locals._auditBody || {}
        const success = (typeof body.code === 'number' ? body.code === 200 : res.statusCode < 400)
        const targetId = req.params?.id || body?.data?.id || null
        const operation = resolveOperation(method, url)
        const moduleName = resolveModule(url)

        // POST 成功时落定 resource_id
        let resourceTable = res.locals._resourceTable || null
        let resourceId = res.locals._resourceId || null
        if (method === 'POST' && success && !resourceId) {
          resourceId = body?.data?.id || null
        }
        // 失败的操作不保留 before_data（避免回撤一个没生效的改动）
        const beforeData = success ? (res.locals._beforeData || null) : null

        await db.query(
          `INSERT INTO log
            (user_id, username, operation, module, method, url, ip, user_agent, params, before_data, resource_table, resource_id, undone, result, status, error_msg, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW())`,
          [
            userId,
            username,
            targetId ? `${operation} #${targetId}` : operation,
            moduleName,
            method,
            url.slice(0, 500),
            clientIp,
            userAgent,
            sanitizeParams(req.body),
            beforeData,
            resourceTable,
            resourceId,
            success ? null : (typeof body.message === 'string' ? body.message.slice(0, 500) : null),
            success ? 1 : 0,
            success ? null : (typeof body.message === 'string' ? body.message.slice(0, 500) : null)
          ]
        )
      } catch (e) {
        console.error('[auditLog] 写入失败:', e.message)
      }
    })
  })

  next()
}

module.exports = auditLog
