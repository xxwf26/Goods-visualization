/**
 * 操作审计中间件
 * 对写操作（POST/PUT/DELETE）在响应完成后异步记录到 log 表。
 * 设计原则：不阻塞请求、不因日志失败影响主流程（fire-and-forget）。
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

function resolveModule(url) {
  const hit = MODULE_MAP.find(m => m.test.test(url))
  return hit ? hit.name : '其他'
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
        // base64 图片、长文本等只留长度提示
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

const auditLog = (req, res, next) => {
  const method = req.method
  // 只审计写操作
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next()
  }
  // 登录接口不记录（无 user 上下文且非数据变更）
  if (req.originalUrl.startsWith('/api/auth/login')) {
    return next()
  }

  // 捕获响应体（沿用项目 {code,message,data} 约定）
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    res.locals._auditBody = body
    return originalJson(body)
  }

  res.on('finish', () => {
    // 异步写日志，绝不影响主请求
    setImmediate(async () => {
      try {
        const url = req.originalUrl.split('?')[0]
        const body = res.locals._auditBody || {}
        const success = (typeof body.code === 'number' ? body.code === 200 : res.statusCode < 400)
        const targetId = req.params?.id || body?.data?.id || null
        const operation = resolveOperation(method, url)
        const moduleName = resolveModule(url)

        await db.query(
          `INSERT INTO log
            (user_id, username, operation, module, method, url, ip, user_agent, params, result, status, error_msg, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            req.user?.id || null,
            req.user?.username || null,
            targetId ? `${operation} #${targetId}` : operation,
            moduleName,
            method,
            url.slice(0, 500),
            (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 50),
            (req.headers['user-agent'] || '').slice(0, 500),
            sanitizeParams(req.body),
            success ? null : (typeof body.message === 'string' ? body.message.slice(0, 500) : null),
            success ? 1 : 0,
            success ? null : (typeof body.message === 'string' ? body.message.slice(0, 500) : null)
          ]
        )
      } catch (e) {
        // 仅打印，不抛出
        console.error('[auditLog] 写入失败:', e.message)
      }
    })
  })

  next()
}

module.exports = auditLog
