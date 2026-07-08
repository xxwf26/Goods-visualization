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
    // B站视频：优先走公开接口拿干净的标题/封面/互动数据；失败落回下方通用 HTML 抓取
    if (redirectCount === 0) {
      const host = (() => { try { return new URL(url).hostname } catch { return '' } })()
      if (host.includes('bilibili.com') || host.includes('b23.tv')) {
        try {
          const bvid = await this.resolveBvid(url)
          if (bvid) {
            const bmeta = await this.fetchBilibili(bvid)
            if (bmeta) return bmeta
          }
        } catch { /* 落回通用 HTML 抓取 */ }
      }
    }
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

  /**
   * 从 B 站链接解析出 BV 号。
   * 支持 /video/BVxxxx、?bvid=BVxxxx；b23.tv 短链先跟随重定向拿真实地址再提取。
   */
  static async resolveBvid(url) {
    const pick = (u) => {
      const m = String(u).match(/BV[0-9A-Za-z]{8,12}/)
      return m ? m[0] : null
    }
    let bvid = pick(url)
    if (bvid) return bvid
    // b23.tv 短链：跟随一次重定向，从 Location 里提取
    const host = (() => { try { return new URL(url).hostname } catch { return '' } })()
    if (host.includes('b23.tv')) {
      const real = await this.resolveRedirect(url)
      if (real) bvid = pick(real)
    }
    return bvid
  }

  /** 发一次请求，返回 3xx 的 Location 绝对地址（用于短链还原），非重定向返回 null */
  static resolveRedirect(url) {
    return new Promise((resolve) => {
      try {
        const client = url.startsWith('https') ? https : http
        const req = client.get(url, { timeout: 10000, headers: this.BROWSER_HEADERS }, (res) => {
          res.resume()
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            try { resolve(new URL(res.headers.location, url).href) } catch { resolve(null) }
          } else { resolve(null) }
        })
        req.on('error', () => resolve(null))
        req.on('timeout', () => { req.destroy(); resolve(null) })
      } catch { resolve(null) }
    })
  }

  /**
   * 调 B 站公开接口获取视频元数据（免登录）。
   * 返回结构与 parseHTML 一致，供 autofillFromUrl 统一消费。
   */
  static fetchBilibili(bvid) {
    const api = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`
    return new Promise((resolve, reject) => {
      const headers = { ...this.BROWSER_HEADERS, 'Accept': 'application/json', 'Referer': 'https://www.bilibili.com/' }
      const req = https.get(api, { timeout: 12000, headers }, (res) => {
        let stream = res
        const enc = (res.headers['content-encoding'] || '').toLowerCase()
        if (enc.includes('gzip')) stream = res.pipe(require('zlib').createGunzip())
        else if (enc.includes('deflate')) stream = res.pipe(require('zlib').createInflate())
        else if (enc.includes('br')) stream = res.pipe(require('zlib').createBrotliDecompress())
        let data = ''
        stream.on('data', c => { data += c.toString('utf8') })
        stream.on('end', () => {
          try {
            const j = JSON.parse(data)
            if (j.code !== 0 || !j.data) { resolve(null); return }
            const v = j.data
            const stat = v.stat || {}
            let image = v.pic || ''
            if (image.startsWith('http://')) image = 'https://' + image.slice(7) // 统一 https，避免混合内容
            resolve({
              title: v.title || '',
              description: v.desc || '',   // 完整简介，不截断
              image,
              platform: 'B站',
              site_name: 'bilibili',
              author: v.owner?.name || '',
              tags: [],
              allImages: [],
              likeCount: this.parseCount(stat.like),
              saveCount: this.parseCount(stat.favorite),
              commentCount: this.parseCount(stat.reply),
              playCount: this.parseCount(stat.view)
            })
          } catch (e) { resolve(null) }
        })
        stream.on('error', () => resolve(null))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    })
  }

  /**
   * 把社媒返回的互动数字解析成真实整数。
   * 小红书/微博等把点赞、收藏数返回成格式化字符串，如 "1.1万"、"10万+"、"1.2k"、"3千"、"1,957"。
   * parseInt("1.1万") 只会得到 1，导致数据严重失真——本函数按单位还原。
   * @param {string|number} v 原始值
   * @returns {number} 还原后的整数（无法解析时返回 0）
   */
  static parseCount(v) {
    if (v == null) return 0
    if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0
    let s = String(v).trim()
    if (!s) return 0
    // 去掉千分位逗号和结尾的 "+"（如 "10万+"、"1,957"）
    s = s.replace(/,/g, '').replace(/\+$/, '')
    // 提取数值部分和单位（万/亿/千/w/k/m）
    const m = s.match(/^([\d.]+)\s*(万|亿|千|w|k|m)?/i)
    if (!m) return 0
    const num = parseFloat(m[1])
    if (!Number.isFinite(num)) return 0
    const unit = (m[2] || '').toLowerCase()
    const mult = { '万': 1e4, 'w': 1e4, '亿': 1e8, '千': 1e3, 'k': 1e3, 'm': 1e6 }[unit] || 1
    return Math.round(num * mult)
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
    let ssrTitle = '', ssrDesc = '', ssrAuthor = '', ssrImage = '', ssrTags = [], ssrAllImages = [], ssrLikeCount = 0, ssrSaveCount = 0, ssrCommentCount = 0
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
          // 收集所有图片URL（供 AI 视觉分析用）
          ssrAllImages = (note.imageList || []).map(img => img.urlDefault || img.infoList?.[0]?.url || img.url).filter(Boolean)
          // 互动数据(点赞/收藏/评论)：小红书返回的是格式化字符串("1.1万"/"10万+"/"1.2k")，需还原成真实整数
          ssrLikeCount = this.parseCount(note.interactInfo?.likedCount)
          ssrSaveCount = this.parseCount(note.interactInfo?.collectedCount)
          ssrCommentCount = this.parseCount(note.interactInfo?.commentCount)
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

    let finalTitle = ssrTitle || getOg('title') || getMeta('twitter:title') || (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || ''

    // 识别 404/不可见页（小红书等限流/私密笔记会跳到 not-found 页）：
    // 没拿到 SSR 真实正文，且标题命中站点 not-found 文案时，清空 title/image/description，
    // 避免把 404 占位图和「你访问的页面不见了」当成内容入库
    const NOT_FOUND_MARKERS = ['你访问的页面不见了', '页面不存在', '页面走丢了', 'page not found']
    if (!ssrTitle && !ssrDesc && !ssrImage && finalTitle && NOT_FOUND_MARKERS.some(m => finalTitle.toLowerCase().includes(m.toLowerCase()))) {
      finalTitle = ''
      finalDesc = ''
      finalImage = ''
    }

    return {
      title: finalTitle,
      description: finalDesc,
      image: finalImage,
      platform,
      site_name: getOg('site_name') || '',
      author: ssrAuthor || '',
      tags: ssrTags,
      allImages: ssrAllImages,
      likeCount: ssrLikeCount,
      saveCount: ssrSaveCount,
      commentCount: ssrCommentCount,
      playCount: 0
    }
  }
}

module.exports = MetaFetcher