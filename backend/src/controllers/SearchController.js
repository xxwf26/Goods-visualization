/**
 * 全局检索 Controller（跨模块即时搜索）
 * GET /api/search?q=关键词
 * 在 历史项目 / 价格记录 / 供应商 / 灵感 / 品类标签 中并行 LIKE 检索，
 * 每组返回完整计数 + 至多 5 条；命中品类标签时附带「品类速览」价格聚合。
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

const ITEM_LIMIT = 5

// DECIMAL 在 mysql2 里是字符串，统一转数字并保留两位
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

// 截断过长文本，用于 subtitle 摘要
function brief(text, max = 40) {
  if (!text) return ''
  const s = String(text).trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}

// 用「 · 」拼接非空片段
function joinParts(parts) {
  return parts.filter(p => p !== null && p !== undefined && String(p).trim() !== '').join(' · ')
}

class SearchController {
  async search(req, res, next) {
    try {
      let q = (req.query.q || '').trim()
      if (!q) {
        return res.status(400).json(Response.badRequest('请输入搜索关键词'))
      }
      if (q.length > 50) q = q.slice(0, 50)
      const like = `%${q}%`

      const [
        project,
        price,
        supplier,
        inspiration,
        designNote,
        tag,
        categoryOverview
      ] = await Promise.all([
        this._searchProject(like),
        this._searchPrice(like),
        this._searchSupplier(like),
        this._searchInspiration(like),
        this._searchDesignNote(like),
        this._searchTag(like),
        this._categoryOverview(like, q)
      ])

      const groups = [
        { type: 'project', label: '历史项目', permission: 'project:view', route: '/projects', ...project },
        { type: 'price', label: '价格记录', permission: 'price:view', route: '/price-records', ...price },
        { type: 'supplier', label: '供应商', permission: 'supplier:view', route: '/suppliers', ...supplier },
        { type: 'inspiration', label: '灵感库', permission: 'inspiration:view', route: '/inspiration', craftTotal: inspiration.craftTotal, ...inspiration },
        { type: 'designNote', label: '设计要求', permission: null, route: '/design-notes', ...designNote },
        { type: 'tag', label: '标签/品类', permission: null, route: null, ...tag }
      ].filter(g => g.total > 0)

      res.json(Response.success({ query: q, categoryOverview, groups }))
    } catch (error) {
      next(error)
    }
  }

  async _searchProject(like) {
    const where = `WHERE is_delete = 0 AND (product_name LIKE ? OR project_name LIKE ?
      OR purchase_order_no LIKE ? OR requester LIKE ? OR region LIKE ?)`
    const params = [like, like, like, like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM project ${where}`, params)
    const rows = await db.query(
      `SELECT id, project_name, product_name, purchase_order_no, requester, region
       FROM project ${where} ORDER BY update_time DESC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.project_name || r.product_name || `项目#${r.id}`,
      subtitle: joinParts([r.product_name, r.purchase_order_no, r.requester && `需求人:${r.requester}`, r.region])
    }))
    return { total: cnt.total, items }
  }

  async _searchPrice(like) {
    const where = `WHERE is_delete = 0 AND (product_name LIKE ? OR category LIKE ? OR ip LIKE ?
      OR supplier_name LIKE ? OR project_name LIKE ? OR remark1 LIKE ?)`
    const params = [like, like, like, like, like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM price_record ${where}`, params)
    const rows = await db.query(
      `SELECT id, product_name, category, ip, supplier_name, unit_price
       FROM price_record ${where} ORDER BY update_time DESC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.product_name || `记录#${r.id}`,
      subtitle: joinParts([
        r.category && `品类:${r.category}`,
        r.ip && `IP:${r.ip}`,
        r.supplier_name,
        r.unit_price != null && `单价 ¥${toNum(r.unit_price)}`
      ])
    }))
    return { total: cnt.total, items }
  }

  async _searchSupplier(like) {
    const where = `WHERE is_delete = 0 AND (supplier_name LIKE ? OR supplier_code LIKE ?
      OR contact_person LIKE ? OR main_products LIKE ?)`
    const params = [like, like, like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM supplier ${where}`, params)
    const rows = await db.query(
      `SELECT id, supplier_name, supplier_code, contact_person, main_products
       FROM supplier ${where} ORDER BY update_time DESC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.supplier_name || `供应商#${r.id}`,
      subtitle: joinParts([
        r.supplier_code && `编码:${r.supplier_code}`,
        r.contact_person && `联系人:${r.contact_person}`,
        brief(r.main_products)
      ])
    }))
    return { total: cnt.total, items }
  }

  async _searchInspiration(like) {
    const where = `WHERE is_delete = 0 AND (title LIKE ? OR description LIKE ? OR author LIKE ?)`
    const params = [like, like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM inspiration ${where}`, params)
    // 工艺灵感单独计数（首页搜索「工艺灵感」维度用）
    const [craftCnt] = await db.query(
      `SELECT COUNT(*) AS total FROM inspiration ${where} AND inspiration_type = 'craft'`,
      params
    )
    const rows = await db.query(
      `SELECT id, title, description, author
       FROM inspiration ${where} ORDER BY update_time DESC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.title || `灵感#${r.id}`,
      subtitle: joinParts([r.author && `作者:${r.author}`, brief(r.description)])
    }))
    return { total: cnt.total, craftTotal: craftCnt.total, items }
  }

  async _searchDesignNote(like) {
    const where = `WHERE is_delete = 0 AND (title LIKE ? OR content LIKE ? OR category LIKE ? OR craft LIKE ?)`
    const params = [like, like, like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM design_note ${where}`, params)
    const rows = await db.query(
      `SELECT id, title, content FROM design_note ${where} ORDER BY update_time DESC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.title || `设计注意#${r.id}`,
      subtitle: brief(r.content)
    }))
    return { total: cnt.total, items }
  }

  async _searchTag(like) {
    // 仅检索品类标签——只有品类有详情路由 /category/:id，避免死链
    const where = `WHERE is_delete = 0 AND tag_type = 'category' AND (tag_name LIKE ? OR tag_code LIKE ?)`
    const params = [like, like]
    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM tag ${where}`, params)
    const rows = await db.query(
      `SELECT id, tag_name, tag_code, tag_type FROM tag ${where} ORDER BY sort ASC, id ASC LIMIT ?`,
      [...params, ITEM_LIMIT]
    )
    const items = rows.map(r => ({
      id: r.id,
      title: r.tag_name || `标签#${r.id}`,
      subtitle: '品类标签',
      tagType: r.tag_type
    }))
    return { total: cnt.total, items }
  }

  // 命中品类标签时，按品类名从 price_record 实时聚合价格（与 /api/price/category/:id 同语义）
  async _categoryOverview(like, q) {
    const [catTag] = await db.query(
      `SELECT id, tag_name FROM tag
       WHERE is_delete = 0 AND tag_type = 'category' AND tag_name LIKE ?
       ORDER BY (tag_name = ?) DESC, CHAR_LENGTH(tag_name) ASC, id ASC
       LIMIT 1`,
      [like, q]
    )
    if (!catTag) return null

    const [stats] = await db.query(
      `SELECT COUNT(*) AS projectCount, AVG(unit_price) AS avgPrice,
              MIN(unit_price) AS minPrice, MAX(unit_price) AS maxPrice
       FROM price_record
       WHERE is_delete = 0 AND unit_price > 0 AND category LIKE ?`,
      [`%${catTag.tag_name}%`]
    )

    return {
      tagId: catTag.id,
      tagName: catTag.tag_name,
      matchedBy: 'tag',
      projectCount: stats.projectCount || 0,
      avgPrice: toNum(stats.avgPrice),
      minPrice: toNum(stats.minPrice),
      maxPrice: toNum(stats.maxPrice)
    }
  }
}

module.exports = new SearchController()
