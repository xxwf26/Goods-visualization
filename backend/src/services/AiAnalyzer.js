/**
 * AI 内容分析服务
 * 用视觉模型(OCR)读取帖子图片文字，再用文本模型总结成结构化内容。
 * 用于小红书等"内容在图片里"的帖子。
 * 分析时会把图片下载到本地永久保存（原始CDN链接会过期）。
 */
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const config = require('../config')

const CFG = {
  apiKey: process.env.AI_API_KEY,
  baseUrl: (process.env.AI_BASE_URL || '').replace(/\/$/, ''),
  ocrModel: process.env.AI_OCR_MODEL || 'qwen-vl-ocr',
  textModel: process.env.AI_TEXT_MODEL || 'glm-5.2'
}

// 下载图片到 uploads 目录，返回本地文件名（失败返回 null）
function downloadImage(url) {
  return new Promise((resolve) => {
    // 强制 https（小红书 CDN 链接可能是 http，升级为 https）
    const safeUrl = url.replace(/^http:\/\//, 'https://')
    const client = safeUrl.startsWith('https') ? https : http
    const ext = /\.(png|jpg|jpeg|webp|gif)/i.test(safeUrl) ? '' : '.webp'
    const filename = `insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    const dest = path.join(config.upload.path, filename)
    const file = fs.createWriteStream(dest)
    const req = client.get(safeUrl, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://www.xiaohongshu.com/' }
    }, (res) => {
      // 跟随重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        file.close(() => fs.existsSync(dest) && fs.unlinkSync(dest))
        downloadImage(res.headers.location).then(resolve)
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
      file.on('error', () => { fs.existsSync(dest) && fs.unlinkSync(dest); resolve(null) })
    })
    req.on('error', () => { fs.existsSync(dest) && fs.unlinkSync(dest); resolve(null) })
    req.on('timeout', () => { req.destroy(); fs.existsSync(dest) && fs.unlinkSync(dest); resolve(null) })
  })
}

// OpenAI 兼容的 chat/completions 调用
function chatCompletion(model, messages, maxTokens = 2000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, max_tokens: maxTokens })
    const url = new URL(CFG.baseUrl + '/chat/completions')
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CFG.apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
    }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          if (j.error) return reject(new Error(j.error.message || 'AI接口错误'))
          resolve(j.choices?.[0]?.message?.content || '')
        } catch (e) { reject(new Error('AI返回解析失败: ' + d.substring(0, 200))) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('AI请求超时')) })
    req.write(body)
    req.end()
  })
}

class AiAnalyzer {
  /**
   * OCR 单张图片，提取所有文字
   */
  static async ocrImage(imageUrl) {
    const content = await chatCompletion(CFG.ocrModel, [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: '识别这张图片里的全部文字内容，保持原有排版和层级，原样输出。只输出识别到的文字，不要解释。' }
      ]
    }], 1500)
    return content.trim()
  }

  /**
   * 分析整个帖子：OCR 所有图片 + 结合正文引言，总结成结构化内容
   * 同时把每张图片下载到本地，返回 {file, text} 结构
   * @param {string[]} imageUrls 图片URL列表
   * @param {string} caption 帖子正文引言（可选）
   * @returns {Promise<{imageTexts:Array, summary:string}>}
   */
  static async analyzePost(imageUrls, caption = '') {
    const imgs = (imageUrls || []).filter(Boolean)
    if (imgs.length === 0 && !caption) {
      throw new Error('没有图片也没有正文，无法分析')
    }

    // 1. 逐张 OCR + 下载（并发3）
    const imageTexts = []
    const concurrency = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < imgs.length) {
        const idx = cursor++
        const url = imgs[idx]
        let text = ''
        let file = null
        try { text = await this.ocrImage(url) } catch (e) { text = '' }
        try { file = await downloadImage(url) } catch { file = null }
        imageTexts[idx] = { index: idx + 1, url, file, text }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, imgs.length) }, () => worker()))

    // 2. 批量清洗各图 OCR 文字：去除水印/装饰/页眉页脚/图形化文字，只留实质内容
    await this.cleanOcrTexts(imageTexts)

    // 3. 汇总所有清洗后文字 + 正文，让文本模型总结
    const ocrText = imageTexts
      .filter(Boolean)
      .map(r => `【图${r.index}】\n${r.text || '(无文字)'}`)
      .join('\n\n')

    const summaryPrompt = `你是一个包装印刷/周边物料领域的助理。下面是一篇社交媒体帖子的内容，包括正文引言和每张图片里识别出的文字。请综合分析，输出结构化总结：

正文引言：
${caption || '(无)'}

各图片识别文字：
${ocrText || '(无)'}

请按以下格式输出（不要输出多余解释）：
【标题】一句话概括帖子主题
【内容总结】150-300字，把图片和正文里的核心信息整理成连贯说明
【关键要点】列出3-8条要点（工艺/参数/适用场景等，每条一行）
【适用场景】这条内容适合用在什么产品/场景`

    let summary = ''
    try {
      summary = await chatCompletion(CFG.textModel, [{ role: 'user', content: summaryPrompt }], 1500)
    } catch (e) {
      summary = '总结生成失败，以下为各图片识别文字：\n\n' + ocrText
    }

    return { imageTexts, summary }
  }

  /**
   * 批量清洗各图 OCR 文字（一次调用）：去除水印、装饰文字、页眉页脚、
   * 与主内容无关的图形化文字（如 "Independent Designer"、"PACKAGING DESIGN"、
   * 乱码"开容"等），只保留实质性内容。原地修改 imageTexts[*].text。
   */
  static async cleanOcrTexts(imageTexts) {
    const items = imageTexts.filter(Boolean)
    if (items.length === 0) return
    const input = items.map(r => `【图${r.index}】\n${r.text || '(无文字)'}`).join('\n\n')
    const prompt = `下面是一篇帖子各图片的原始OCR文字，其中混有水印、装饰文字、页眉页脚、图形化英文标题、OCR乱码等与主内容无关的内容。请逐图清洗，只保留每张图实质性的正文内容（如工艺名称、介绍、效果、用途等），删除无关装饰文字。如果某张图清洗后无实质内容，输出"（无实质内容）"。

原始OCR：
${input}

请严格按以下格式输出，每张图一段，不要输出任何解释：
<<<图1>>>
（清洗后文字）
<<<图2>>>
（清洗后文字）
...依此类推`

    let resp = ''
    try {
      resp = await chatCompletion(CFG.textModel, [{ role: 'user', content: prompt }], 2500)
    } catch (e) { return } // 清洗失败则保留原始文字

    // 解析 <<<图N>>> 分隔的各段
    for (const r of items) {
      const re = new RegExp(`<<<图${r.index}>>>\\s*([\\s\\S]*?)(?=<<<图\\d+>>>|$)`)
      const m = resp.match(re)
      if (m && m[1].trim()) r.text = m[1].trim()
    }
  }
}

module.exports = AiAnalyzer

