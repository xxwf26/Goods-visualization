/**
 * 安全响应头中间件（轻量替代 helmet，不引依赖）
 * - X-Content-Type-Options: nosniff  阻止浏览器 MIME 嗅探（缓解上传文件被当成可执行类型）
 * - X-Frame-Options: DENY            防点击劫持（页面禁止被 iframe 嵌套）
 * - Referrer-Policy: no-referrer     不泄露来源 URL
 * - Permissions-Policy               关闭不用的浏览器能力
 * - Strict-Transport-Security        仅 HTTPS 下启用 HSTS
 * 注：X-XSS-Protection 设为 0，现代浏览器建议关闭有缺陷的 XSS Auditor，改靠 CSP（API 服务无需 CSP）
 */
module.exports = function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  res.setHeader('X-XSS-Protection', '0')
  // HTTPS 下启用 HSTS（含反向代理场景）
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}
