/**
 * 图片下载工具：把远程图片下载到 uploads 目录，返回本地文件名。
 * 用于把易过期的 CDN 链接（小红书等）固化成本地永久文件。
 */
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const config = require('../config')

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.xiaohongshu.com/'
}

/**
 * 下载图片到 uploads 目录
 * @param {string} url 图片URL
 * @param {string} prefix 文件名前缀（如 insp/cover）
 * @returns {Promise<string|null>} 本地文件名，失败返回 null
 */
function downloadImage(url, prefix = 'insp') {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const safeUrl = url.replace(/^http:\/\//, 'https://')
    const client = safeUrl.startsWith('https') ? https : http
    const ext = /\.(png|jpg|jpeg|webp|gif)/i.test(safeUrl) ? '' : '.webp'
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    const dest = path.join(config.upload.path, filename)
    // 确保上传目录存在（否则 createWriteStream 会抛 ENOENT 的 'error' 事件；若无监听器会崩掉整个进程）
    try { fs.mkdirSync(config.upload.path, { recursive: true }) } catch { /* 已存在 */ }
    const file = fs.createWriteStream(dest)
    // 错误监听器必须在任何异步操作前挂上——目录/磁盘问题的 error 事件会在 http 回调前触发
    file.on('error', () => { try { fs.existsSync(dest) && fs.unlinkSync(dest) } catch {} ; resolve(null) })
    const req = client.get(safeUrl, { timeout: 15000, headers: BROWSER_HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        file.close(() => fs.existsSync(dest) && fs.unlinkSync(dest))
        downloadImage(res.headers.location, prefix).then(resolve)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        file.close(() => fs.existsSync(dest) && fs.unlinkSync(dest))
        resolve(null)
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(() => resolve(filename)) })
    })
    req.on('error', () => { fs.existsSync(dest) && fs.unlinkSync(dest); resolve(null) })
    req.on('timeout', () => { req.destroy(); fs.existsSync(dest) && fs.unlinkSync(dest); resolve(null) })
  })
}

module.exports = { downloadImage }
