/**
 * 简易内存限流中间件
 * 按 user+url 统计调用次数，超限返回 429
 * 用法: router.post('/recommend', rateLimit({ windowMs: 60000, max: 5 }), handler)
 */
const store = new Map()

function rateLimit({ windowMs = 60000, max = 5 } = {}) {
  return (req, res, next) => {
    const key = `${req.user?.id || req.ip}:${req.originalUrl.split('?')[0]}`
    const now = Date.now()
    const record = store.get(key)

    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    record.count++
    if (record.count > max) {
      const retry = Math.ceil((record.resetAt - now) / 1000)
      res.setHeader('Retry-After', retry)
      return res.status(429).json({
        code: 429,
        message: `请求过于频繁，请 ${retry} 秒后再试（限 ${max} 次/${windowMs / 1000}秒）`,
        data: null
      })
    }

    next()
  }
}

module.exports = { rateLimit }
