/**
 * AI 内容分析服务
 * 用视觉模型(OCR)读取帖子图片文字，再用文本模型总结成结构化内容。
 * 用于小红书等"内容在图片里"的帖子。
 */
const https = require('https')

const CFG = {
  apiKey: process.env.AI_API_KEY,
  baseUrl: (process.env.AI_BASE_URL || '').replace(/\/$/, ''),
  ocrModel: process.env.AI_OCR_MODEL || 'qwen-vl-ocr',
  textModel: process.env.AI_TEXT_MODEL || 'glm-5.2'
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
   * @param {string[]} imageUrls 图片URL列表
   * @param {string} caption 帖子正文引言（可选）
   * @returns {Promise<{ocrResults:Array,summary:string}>}
   */
  static async analyzePost(imageUrls, caption = '') {
    const imgs = (imageUrls || []).filter(Boolean)
    if (imgs.length === 0 && !caption) {
      throw new Error('没有图片也没有正文，无法分析')
    }

    // 1. 逐张 OCR（限制并发3，避免触发限流）
    const ocrResults = []
    const concurrency = 3
    let cursor = 0
    const worker = async () => {
      while (cursor < imgs.length) {
        const idx = cursor++
        try {
          const text = await this.ocrImage(imgs[idx])
          ocrResults[idx] = { index: idx + 1, url: imgs[idx], text }
        } catch (e) {
          ocrResults[idx] = { index: idx + 1, url: imgs[idx], text: '', error: e.message }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, imgs.length) }, () => worker()))

    // 2. 汇总所有 OCR 文字 + 正文，让文本模型总结
    const ocrText = ocrResults
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
      // 文本模型失败时，至少把 OCR 文字拼接返回
      summary = '总结生成失败，以下为各图片识别文字：\n\n' + ocrText
    }

    return { ocrResults, summary }
  }
}

module.exports = AiAnalyzer
