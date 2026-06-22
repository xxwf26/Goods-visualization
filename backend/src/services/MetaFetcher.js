/**
 * URL 元数据抓取服务
 * 从公开网页提取标题、描述、封面图
 */
const https = require('https')
const http = require('http')
const dns = require('dns').promises
const net = require('net')

const MAX_REDIRECTS = 3
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2MB

// 判断 IP 是否属于内网/环回/链路本地等不可对外抓取的地址
function isBlockedIp(ip) {
  const type = net.isIP(ip)
  if (type === 4) {
    const p = ip.split('.').map(Number)
    if (p[0] === 10) return true                          // 10.0.0.0/8
    if (p[0] === 127) return true                         // 127.0.0.0/8 环回
    if (p[0] === 0) return true                           // 0.0.0.0/8
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true         // 192.168.0.0/16
    if (p[0] === 169 && p[1] === 254) return true         // 169.254.0.0/16 链路本地/云元数据
    return false
  }
  if (type === 6) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true            // 环回/未指定
    if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true // 链路本地/ULA
    if (v.startsWith('::ffff:')) return isBlockedIp(v.slice(7)) // IPv4 映射
    return false
  }
  return true // 无法识别一律拒绝
}

// 校验 URL 安全性：协议白名单 + 解析主机名拦截私网
async function assertSafeUrl(url) {
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('非法 URL') }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接')
  }
  // 主机名本身就是 IP
  if (net.isIP(parsed.hostname) && isBlockedIp(parsed.hostname)) {
    throw new Error('禁止访问内网地址')
  }
  // 解析域名对应的所有 IP，任一命中私网即拒绝（防 DNS 重绑定/内网域名）
  try {
    const addrs = await dns.lookup(parsed.hostname, { all: true })
    if (addrs.some(a => isBlockedIp(a.address))) {
      throw new Error('禁止访问内网地址')
    }
  } catch (e) {
    if (e.message === '禁止访问内网地址') throw e
    throw new Error('域名解析失败')
  }
}

class MetaFetcher {
  static async fetch(url, redirectCount = 0) {
    await assertSafeUrl(url)
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
        // 处理重定向（限制次数，并对新地址再次做安全校验）
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume() // 丢弃响应体，释放连接
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error('重定向次数过多'))
            return
          }
          const next = (() => { try { return new URL(res.headers.location, url).href } catch { return null } })()
          if (!next) { reject(new Error('非法重定向地址')); return }
          this.fetch(next, redirectCount + 1).then(resolve).catch(reject)
          return
        }
        let data = ''
        let size = 0
        res.on('data', chunk => {
          size += chunk.length
          if (size > MAX_BODY_BYTES) {
            req.destroy()
            reject(new Error('响应体过大'))
            return
          }
          data += chunk
        })
        res.on('end', () => {
          const meta = this.parseHTML(data, url)
          resolve(meta)
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    })
  }

  static parseHTML(html, baseUrl) {
    const getMeta = (name) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)`,'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,'i'))
      return match ? match[1] : null
    }
    const getOg = (prop) => getMeta(`og:${prop}`)

    let image = getOg('image') || getMeta('twitter:image')
    // 修正相对路径
    if (image && image.startsWith('/')) {
      try { image = new URL(image, baseUrl).href } catch {}
    }

    // 识别平台
    let platform = '其他'
    const host = (() => { try { return new URL(baseUrl).hostname } catch { return '' } })()
    if (host.includes('xiaohongshu') || host.includes('xhslink')) platform = '小红书'
    else if (host.includes('taobao')) platform = '淘宝'
    else if (host.includes('1688')) platform = '1688'
    else if (host.includes('zcool')) platform = '站酷'
    else if (host.includes('weibo')) platform = '微博'
    else if (host.includes('douyin')) platform = '抖音'
    else if (host.includes('pinterest')) platform = 'Pinterest'
    else if (host.includes('instagram')) platform = 'Instagram'
    else if (host.includes('bilibili')) platform = 'B站'

    return {
      title: getOg('title') || getMeta('twitter:title') || (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '',
      description: getOg('description') || getMeta('description') || '',
      image: image || '',
      platform,
      site_name: getOg('site_name') || '',
    }
  }
}

module.exports = MetaFetcher