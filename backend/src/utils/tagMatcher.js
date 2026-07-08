/**
 * 标签匹配工具
 * 把帖子/视频的原始话题标签（post_tags）按名称直接匹配到库里已有的
 * IP/品类/工艺/场景标签 ID。抽自 InspirationController.handleAnalyze，供
 * 新建抓取(autofillFromUrl)与 AI 分析(handleAnalyze)共用，避免逻辑重复。
 */

/**
 * 从 tag 表加载全部启用标签，按 type 分组。
 * @param {{query: Function}} db 数据库连接（config/database）
 * @returns {Promise<{ip:Array,category:Array,craft:Array,scene:Array}>} 每项为 {id,name} 列表
 */
async function loadTagsByType(db) {
  const tags = await db.query("SELECT id, tag_name, tag_type FROM tag WHERE is_delete=0 AND status=1")
  const tagsByType = { ip: [], category: [], craft: [], scene: [] }
  for (const t of tags) {
    if (tagsByType[t.tag_type]) tagsByType[t.tag_type].push({ id: t.id, name: t.tag_name })
  }
  return tagsByType
}

/**
 * 用原始标签名直接匹配标签 ID（名称相等或互相包含即命中）。
 * @param {string[]} postTags 原始话题标签名数组
 * @param {{ip:Array,category:Array,craft:Array,scene:Array}} tagsByType loadTagsByType 的产物
 * @returns {{ip:number[],category:number[],craft:number[],scene:number[]}} 各类命中的标签 id 数组
 */
function matchTagIds(postTags, tagsByType) {
  const matched = { ip: new Set(), category: new Set(), craft: new Set(), scene: new Set() }
  const list = Array.isArray(postTags) ? postTags : []
  for (const raw of list) {
    const pt = String(raw || '').trim()
    if (!pt) continue
    for (const [type, tags] of Object.entries(tagsByType)) {
      if (!matched[type]) continue
      const found = tags.find(t => t.name === pt || pt.includes(t.name) || t.name.includes(pt))
      if (found) matched[type].add(found.id)
    }
  }
  return {
    ip: [...matched.ip],
    category: [...matched.category],
    craft: [...matched.craft],
    scene: [...matched.scene]
  }
}

module.exports = { loadTagsByType, matchTagIds }
