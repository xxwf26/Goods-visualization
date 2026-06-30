/**
 * 外部链接探活服务
 * 轻量检测外部灵感链接是否仍可访问，结果用于「失效提醒」。
 *
 * 状态分类（保守，尽量不误判小红书/淘宝等反爬平台）：
 *   ok    —— 2xx / 3xx，链接正常
 *   dead  —— 仅 404 / 410，确定性失效（页面已删除）
 *   error —— 其它 4xx(401/403/405/429)/5xx/超时/网络错误：无法确认，标「无法验证」而非「失效」
 */
const https = require('https')
const http = require('http')
const { assertSafeUrl } = require('../utils/urlSafety')

const MAX_REDIRECTS = 3
const TIMEOUT_MS = 8000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

function classify(httpCode) {
  if (httpCode >= 200 && httpCode < 400) return 'ok'
  if (httpCode === 404 || httpCode === 410) return 'dead'
  return 'error'
}

// 发一次请求（HEAD 或 GET），只取状态码，不读响应体
function request(url, method, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.request(url, { method, timeout: TIMEOUT_MS, headers: { 'User-Agent': UA } }, (res) => {
      const code = res.statusCode || 0
      res.resume() // 丢弃响应体，释放连接
      // 跟随重定向并对新地址再做安全校验
      if (code >= 300 && code < 400 && res.headers.location) {
        if (redirectCount >= MAX_REDIRECTS) { resolve(code); return }
        let next
        try { next = new URL(res.headers.location, url).href } catch { resolve(code); return }
        assertSafeUrl(next)
          .then(() => request(next, method, redirectCount + 1).then(resolve).catch(reject))
          .catch(reject)
        return
      }
      resolve(code)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

class LinkChecker {
  /**
   * 探活单个 URL。
   * @returns {Promise<{status:'ok'|'dead'|'error', httpCode:number|null, reason?:string}>}
   */
  static async check(url) {
    if (!url) return { status: 'error', httpCode: null, reason: '无链接' }
    try {
      await assertSafeUrl(url)
    } catch (e) {
      return { status: 'error', httpCode: null, reason: e.message }
    }
    try {
      let code = await request(url, 'HEAD')
      // HEAD 在很多站点不可靠（小红书首页 HEAD 返回 404、淘宝/CDN 对 HEAD 返回
      // 403/405 等），只要 HEAD 看着不正常（非 2xx/3xx）就用 GET 复核一次，
      // 避免把"对 HEAD 返回 404/410 但 GET 正常"的有效链接误判为失效。
      if (classify(code) !== 'ok') {
        try { code = await request(url, 'GET') } catch { /* 用 HEAD 结果兜底 */ }
      }
      return { status: classify(code), httpCode: code }
    } catch (e) {
      return { status: 'error', httpCode: null, reason: e.message }
    }
  }

  /**
   * 限并发批量探活。
   * @param {Array<{id:number,url:string}>} items
   * @param {(id:number, r:object)=>Promise<void>} onResult 每条结果回调（用于落库）
   * @param {number} concurrency
   * @returns {Promise<{checked:number, ok:number, dead:number, error:number}>}
   */
  static async checkBatch(items, onResult, concurrency = 5) {
    const summary = { checked: 0, ok: 0, dead: 0, error: 0 }
    let cursor = 0
    const worker = async () => {
      while (cursor < items.length) {
        const item = items[cursor++]
        const r = await this.check(item.url)
        summary.checked++
        summary[r.status]++
        if (onResult) await onResult(item.id, r)
      }
    }
    const n = Math.min(concurrency, items.length) || 0
    await Promise.all(Array.from({ length: n }, () => worker()))
    return summary
  }
}

module.exports = LinkChecker
