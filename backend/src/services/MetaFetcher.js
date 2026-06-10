/**
 * URL 元数据抓取服务
 * 从公开网页提取标题、描述、封面图
 */
const https = require('https')
const http = require('http')

class MetaFetcher {
  static async fetch(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
        // 处理重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.fetch(res.headers.location).then(resolve).catch(reject)
          return
        }
        let data = ''
        res.on('data', chunk => data += chunk)
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