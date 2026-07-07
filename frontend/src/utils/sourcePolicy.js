/**
 * 来源敏感策略（前端）
 * 代码仓库等敏感来源不在卡片/详情展示「跳转链接」，避免源码地址泄露。
 * 与后端 utils/urlSafety.js 的 isSensitiveSource 保持同构。
 */
const SENSITIVE_SOURCE_HOSTS = ['github.com', 'gitee.com']

export function isSensitiveSource(url) {
  if (!url) return false
  try {
    const h = new URL(url).hostname.toLowerCase()
    return SENSITIVE_SOURCE_HOSTS.some(s => h === s || h.endsWith('.' + s))
  } catch {
    return false
  }
}
