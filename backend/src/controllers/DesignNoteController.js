/**
 * 生产/设计注意事项 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

class DesignNoteController {
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 20, keyword, note_type, category, craft, ip, sort_field = 'create_time', sort_order = 'DESC' } = req.query
      const offset = (page - 1) * pageSize
      let where = 'WHERE is_delete = 0'
      const params = []

      if (keyword) {
        where += ' AND (title LIKE ? OR content LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`)
      }
      if (note_type) { where += ' AND note_type = ?'; params.push(note_type) }
      if (category) { where += ' AND category LIKE ?'; params.push(`%${category}%`) }
      if (craft) { where += ' AND craft LIKE ?'; params.push(`%${craft}%`) }
      if (ip) { where += ' AND ip LIKE ?'; params.push(`%${ip}%`) }

      const validSort = ['create_time', 'update_time', 'title']
      const sf = validSort.includes(sort_field) ? sort_field : 'create_time'
      const so = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      const [cnt] = await db.query(`SELECT COUNT(*) as total FROM design_note ${where}`, params)
      const list = await db.query(`SELECT * FROM design_note ${where} ORDER BY ${sf} ${so} LIMIT ? OFFSET ?`, [...params, parseInt(pageSize), parseInt(offset)])

      res.json(Response.success({ list, pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total: cnt.total, totalPages: Math.ceil(cnt.total / pageSize) } }))
    } catch (e) { next(e) }
  }

  async detail(req, res, next) {
    try {
      const [r] = await db.query('SELECT * FROM design_note WHERE id = ? AND is_delete = 0', [req.params.id])
      if (!r) return res.status(404).json(Response.notFound('记录不存在'))
      res.json(Response.success(r))
    } catch (e) { next(e) }
  }

  async create(req, res, next) {
    try {
      const v = validate(req.body).required(['title']).maxLength('title', 200)
      if (!v.validate()) return res.status(400).json(Response.badRequest(v.getFirstError()))

      const { title, content, note_type, category, craft, ip, images, attachments, remark } = req.body
      const result = await db.query(
        'INSERT INTO design_note (title, content, note_type, category, craft, ip, images, attachments, remark, create_user_id, create_time, update_time, is_delete) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0)',
        [title, content, note_type, category, craft, ip, images, attachments, remark, req.user?.id]
      )
      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (e) { next(e) }
  }

  async update(req, res, next) {
    try {
      const { title, content, note_type, category, craft, ip, images, attachments, remark } = req.body
      const r = await db.query(
        `UPDATE design_note SET title=COALESCE(?,title),content=COALESCE(?,content),note_type=COALESCE(?,note_type),category=COALESCE(?,category),craft=COALESCE(?,craft),ip=COALESCE(?,ip),images=COALESCE(?,images),attachments=COALESCE(?,attachments),remark=COALESCE(?,remark),update_time=NOW() WHERE id=? AND is_delete=0`,
        [title, content, note_type, category, craft, ip, images, attachments, remark, req.params.id]
      )
      if (r.affectedRows === 0) return res.status(404).json(Response.notFound('记录不存在'))
      res.json(Response.success(null, '更新成功'))
    } catch (e) { next(e) }
  }

  async delete(req, res, next) {
    try {
      if (!req.user?.role_codes?.includes('super_admin') && !req.user?.role_codes?.includes('admin')) {
        return res.status(403).json(Response.forbidden('仅管理员可删除'))
      }
      const r = await db.query('UPDATE design_note SET is_delete=1,update_time=NOW() WHERE id=? AND is_delete=0', [req.params.id])
      if (r.affectedRows === 0) return res.status(404).json(Response.notFound('记录不存在'))
      res.json(Response.success(null, '删除成功'))
    } catch (e) { next(e) }
  }
}

module.exports = new DesignNoteController()