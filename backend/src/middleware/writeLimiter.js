/**
 * 写接口限流（防脚本批量刷创建/修改/删除）
 * - 仅对 POST/PUT/DELETE/PATCH 生效，读接口不限
 * - 按用户 keying（从 JWT decode 取 id，未登录回退 IP），多人各自独立配额互不干扰
 * - 阈值留足余量：120 次/分钟/用户，人工操作远达不到，只拦脚本
 * - 内存计数，进程重启清空（够用；多实例可换 Redis）
 */
const jwt = require('jsonwebtoken')

const WINDOW_MS = 60 * 1000
const MAX = 120
const counts = new Map() // key -> { count, firstAt }

function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

// 取限流 key：登录用户按 id，未登录按 IP
function rateKey(req) {
  const auth = req.headers.authorization || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m) {
    try {
      const payload = jwt.decode(m[1])
      if (payload?.id) return 'u:' + payload.id
    } catch { /* token 非法/过期，回退 IP */ }
  }
  return 'ip:' + clientIp(req)
}

module.exports = function writeLimiter(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()
  const k = rateKey(req)
  const now = Date.now()
  let rec = counts.get(k)
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    rec = { count: 0, firstAt: now }
    counts.set(k, rec)
  }
  rec.count++
  if (rec.count > MAX) {
    const retry = Math.ceil((WINDOW_MS - (now - rec.firstAt)) / 1000)
    res.setHeader('Retry-After', retry)
    return res.status(429).json({
      code: 429,
      message: '操作过于频繁，请稍后再试'
    })
  }
  next()
}
