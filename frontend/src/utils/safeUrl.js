/**
 * 安全 URL 工具：仅放行 http/https 协议，杜绝 javascript:/data:/vbscript: 等协议
 * 被注入到 :href 触发的存储型 XSS。
 * @param {string} url
 * @returns {string} 合法则原样返回，否则返回空串
 */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const s = url.trim()
  // 必须以 http:// 或 https:// 开头；相对协议 // 和 javascript:/data: 全部拒绝
  return /^https?:\/\//i.test(s) ? s : ''
}
