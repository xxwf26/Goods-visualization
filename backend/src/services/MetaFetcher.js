/**
 * URL 元数据抓取服务
 * 从公开网页提取标题、描述、封面图
 */
const https = require('https')
const http = require('http')
const { assertSafeUrl } = require('../utils/urlSafety')

const MAX_REDIRECTS = 3
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2MB

class MetaFetcher {
  // 完整浏览器请求头，绕过基础反爬识别（小红书/微博等会检查 Accept/Referer/语言等）
  static BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }

  static async fetch(url, redirectCount = 0) {
    await assertSafeUrl(url)
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { timeout: 12000, headers: this.BROWSER_HEADERS }, (res) => {
        // gzip/deflate/br 解压
        let stream = res
        const enc = (res.headers['content-encoding'] || '').toLowerCase()
        if (enc.includes('gzip')) stream = res.pipe(require('zlib').createGunzip())
        else if (enc.includes('deflate')) stream = res.pipe(require('zlib').createInflate())
        else if (enc.includes('br')) stream = res.pipe(require('zlib').createBrotliDecompress())
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
        stream.on('data', chunk => {
          size += chunk.length
          if (size > MAX_BODY_BYTES) {
            req.destroy()
            reject(new Error('响应体过大'))
            return
          }
          data += chunk.toString('utf8')
        })
        stream.on('end', () => {
          const meta = this.parseHTML(data, url)
          resolve(meta)
        })
        stream.on('error', reject)
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

    // 从 SSR 注入的 __INITIAL_STATE__ 提取真实正文（小红书等 JS 渲染站点正文在此，meta 只有站点通用信息）
    let ssrTitle = '', ssrDesc = '', ssrAuthor = '', ssrImage = '', ssrTags = []
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/)
    if (stateMatch) {
      try {
        const state = JSON.parse(stateMatch[1].replace(/\bundefined\b/g, 'null'))
        // 小红书：state.note.noteDetailMap[id].note
        let note = null
        if (state.note?.noteDetailMap) {
          const keys = Object.keys(state.note.noteDetailMap)
          note = keys.length ? state.note.noteDetailMap[keys[0]]?.note : null
        }
        if (!note) note = state.note?.firstNote || state.note?.note
        if (note) {
          ssrTitle = note.title || ''
          ssrDesc = note.desc || ''
          ssrAuthor = note.user?.nickname || note.user?.name || ''
          ssrImage = note.imageList?.[0]?.urlDefault || note.imageList?.[0]?.infoList?.[0]?.url || note.imageList?.[0]?.url || note.cover?.url || ''
          ssrTags = (note.tagList || note.descTags || []).map(t => t.name || t).filter(Boolean)
        }
      } catch { /* SSR 解析失败，回退 meta */ }
    }

    // SSR 提取到的真实内容优先；没有再用 meta 兜底（避免抓到站点通用描述）
    let finalDesc = ssrDesc || getOg('description') || getMeta('description') || ''
    // 若描述是站点通用语（小红书/B站等首页兜底文案），且没拿到 SSR 正文，则置空避免误导
    const genericDesc = ['3 亿人的生活经验', '你访问的页面不见了']
    if (!ssrDesc && genericDesc.some(g => finalDesc.includes(g))) finalDesc = ''

    let finalImage = ssrImage || image || ''
    if (finalImage && finalImage.startsWith('/')) {
      try { finalImage = new URL(finalImage, baseUrl).href } catch {}
    }

    return {
      title: ssrTitle || getOg('title') || getMeta('twitter:title') || (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '',
      description: finalDesc,
      image: finalImage,
      platform,
      site_name: getOg('site_name') || '',
      author: ssrAuthor || '',
      tags: ssrTags
    }
  }
}

module.exports = MetaFetcher