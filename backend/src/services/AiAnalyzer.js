/**
 * AI 内容分析服务
 * 用视觉模型(OCR)读取帖子图片文字，再用文本模型总结成结构化内容。
 * 用于小红书等"内容在图片里"的帖子。
 * 分析时会把图片下载到本地永久保存（原始CDN链接会过期）。
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const config = require('../config')
const { downloadImage } = require('../utils/imageDownload')

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
    }], 2000)
    return content.trim()
  }

  /**
   * OCR 本地图片文件（转 base64 发给视觉模型），用于登录墙平台(1688/淘宝)的截图识别
   * @param {string} filename uploads 目录下的文件名
   */
  static async ocrLocalFile(filename) {
    const filePath = path.join(config.upload.path, filename)
    if (!fs.existsSync(filePath)) return ''
    const buf = fs.readFileSync(filePath)
    const ext = /\.(jpe?g|png|webp|gif)$/i.test(filename) ? RegExp.$1.toLowerCase() : 'webp'
    const mime = ext === 'jpg' ? 'jpeg' : ext
    const b64 = `data:image/${mime};base64,${buf.toString('base64')}`
    const content = await chatCompletion(CFG.ocrModel, [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: b64 } },
        { type: 'text', text: '识别这张图片里的全部文字内容，保持原有排版和层级，原样输出。只输出识别到的文字，不要解释。' }
      ]
    }], 2000)
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

    const summary = await this.summarize(ocrText, caption)
    return { imageTexts, summary }
  }

  /**
   * 综合正文 + 各图 OCR 文字，生成结构化总结
   */
  static async summarize(ocrText, caption = '') {
    const summaryPrompt = `你是一个包装印刷/周边物料领域的助理。下面是一篇社交媒体帖子的内容，包括正文引言和每张图片里识别出的文字。请综合分析，输出结构化总结：

正文引言：
${caption || '(无)'}

各图片识别文字：
${ocrText || '(无)'}

请按以下格式输出（不要输出多余解释）：
【标题】一句话概括帖子主题
【内容总结】把图片和正文里的核心信息尽量完整地整理成连贯说明，不要省略重要细节，上限2000字
【关键要点】列出3-8条要点（工艺/参数/适用场景等，每条一行）
【适用场景】这条内容适合用在什么产品/场景`

    try {
      return await chatCompletion(CFG.textModel, [{ role: 'user', content: summaryPrompt }], 4000)
    } catch (e) {
      return '总结生成失败，以下为各图片识别文字：\n\n' + ocrText
    }
  }

  /**
   * AI 多分类：根据内容判断灵感属于哪些分类(可多选，至少1个)
   * @param {string} content 标题+正文+总结+OCR文字
   * @returns {Promise<string[]>} 分类值数组，如 ['peripheral','effect']
   */
  static async categorize(content) {
    const prompt = `你是周边物料领域专家。根据帖子内容，判断它属于以下哪些分类（可多选，至少选1个，只选确实相关的）：

1. packaging（包装结构）：礼盒、纸袋、卡套、开窗、抽拉盒、内托、外箱及运输包装等包装结构参考
2. peripheral（周边品类灵感）：亚克力立牌、透卡、徽章、色纸、金属、PVC、纸品、礼盒套组等周边成品参考
3. effect（效果与特殊工艺）：贝壳光、仿螺钿、反光、镭射、烫金、云母、幻彩、局部UV、立体烫金、压纹等视觉效果/工艺
4. production（印刷与生产攻略）：纸张类型、印刷方式、覆膜、打样流程、工艺拆解、文件制作及生产避坑等

帖子内容：
${(content || '').substring(0, 1200)}

只输出分类值(英文)，逗号分隔，不要解释。例如：peripheral,effect`

    let resp = ''
    try {
      resp = await chatCompletion(CFG.textModel, [{ role: 'user', content: prompt }], 2000)
    } catch (e) { return [] }
    const valid = ['packaging', 'peripheral', 'effect', 'production']
    const result = resp.split(/[,，\s]+/).map(s => s.trim().toLowerCase()).filter(s => valid.includes(s))
    // 去重
    return [...new Set(result)]
  }

  /**
   * 从内容中提取价值说明 + 匹配标签库
   * @param {string} content 正文+图片OCR文字
   * @param {Object} tagsByType { ip:[{id,name}], category:[...], craft:[...], scene:[...] }
   * @returns {Promise<{reference_value, tagIds:{ip,category,craft,scene}}>}
   */
  static async extractMeta(content, tagsByType) {
    const tagLib = {}
    for (const t of ['ip', 'category', 'craft', 'scene']) {
      tagLib[t] = (tagsByType[t] || []).map(x => x.name)
    }
    const prompt = `你是包装印刷/周边物料领域的助理。根据帖子内容完成两件事：
1. 价值说明：用一句话(50字内)说明这条灵感对周边物料采购/设计的参考价值
2. 标签匹配：从标签库里选出与本帖内容确实相关的标签(宁少勿多，不确定就不选)

帖子内容：
${(content || '').substring(0, 1500)}

标签库：
IP类: ${tagLib.ip.join('、') || '(无)'}
品类类: ${tagLib.category.join('、') || '(无)'}
工艺类: ${tagLib.craft.join('、') || '(无)'}
场景类: ${tagLib.scene.join('、') || '(无)'}

只输出JSON，不要解释：
{"reference_value":"价值说明","ip":["标签名"],"category":["标签名"],"craft":["标签名"],"scene":["标签名"]}`

    let resp = ''
    try {
      resp = await chatCompletion(CFG.textModel, [{ role: 'user', content: prompt }], 2500)
    } catch (e) {
      return { reference_value: '', tagIds: {} }
    }
    // 提取JSON
    const m = resp.match(/\{[\s\S]*\}/)
    if (!m) return { reference_value: '', tagIds: {} }
    let obj
    try { obj = JSON.parse(m[0]) } catch { return { reference_value: '', tagIds: {} } }

    // 标签名匹配回ID
    const tagIds = {}
    for (const t of ['ip', 'category', 'craft', 'scene']) {
      const names = obj[t] || []
      tagIds[t] = (tagsByType[t] || []).filter(x => names.includes(x.name)).map(x => x.id)
    }
    return { reference_value: obj.reference_value || '', tagIds }
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

