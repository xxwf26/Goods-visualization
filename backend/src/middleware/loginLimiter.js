/**
 * 登录接口 IP 限流（内存版，无依赖）
 * 防 /auth/login 暴力破解：每个 IP 在窗口期内超过阈值则返回 429。
 * 进程重启清空（够用；多实例部署可换 Redis 版）。
 */
const WINDOW_MS = 15 * 60 * 1000 // 15 分钟窗口
const MAX_ATTEMPTS = 10           // 窗口内最多 10 次登录尝试

const attempts = new Map() // ip -> { count, firstAt }

// 取真实客户端 IP（兼容反向代理）
function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

module.exports = function loginLimiter(req, res, next) {
  const ip = clientIp(req)
  const now = Date.now()
  let rec = attempts.get(ip)
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    rec = { count: 0, firstAt: now }
    attempts.set(ip, rec)
  }
  rec.count++
  if (rec.count > MAX_ATTEMPTS) {
    const retrySec = Math.ceil((WINDOW_MS - (now - rec.firstAt)) / 1000)
    res.setHeader('Retry-After', retrySec)
    return res.status(429).json({
      code: 429,
      message: `登录尝试过于频繁，请 ${retrySec} 秒后再试`
    })
  }
  next()
}

// 暴露清理函数（可选，用于测试/手动重置）
module.exports.reset = () => attempts.clear()
