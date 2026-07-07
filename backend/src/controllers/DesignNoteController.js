/**
 * 生产/设计注意事项 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { validate } = require('../utils/validator')

const VALID_SEVERITY = ['fatal', 'important', 'suggestion']

class DesignNoteController {
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 20, keyword, note_type, category, craft, ip, severity, stage, sort_field = 'create_time', sort_order = 'DESC' } = req.query
      const offset = (page - 1) * pageSize
      let where = 'WHERE d.is_delete = 0'
      const params = []

      if (keyword) {
        where += ' AND (d.title LIKE ? OR d.content LIKE ? OR d.correct_practice LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }
      if (note_type) { where += ' AND d.note_type = ?'; params.push(note_type) }
      if (category) { where += ' AND d.category LIKE ?'; params.push(`%${category}%`) }
      if (craft) { where += ' AND d.craft LIKE ?'; params.push(`%${craft}%`) }
      if (ip) { where += ' AND d.ip LIKE ?'; params.push(`%${ip}%`) }
      if (severity && VALID_SEVERITY.includes(severity)) { where += ' AND d.severity = ?'; params.push(severity) }
      // stage 为逗号分隔多选，用 FIND_IN_SET 命中任一
      if (stage) { where += ' AND FIND_IN_SET(?, d.stage) > 0'; params.push(stage) }

      const validSort = ['create_time', 'update_time', 'title', 'severity']
      const sf = validSort.includes(sort_field) ? sort_field : 'create_time'
      const so = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      const [cnt] = await db.query(`SELECT COUNT(*) as total FROM design_note d ${where}`, params)
      const list = await db.query(
        `SELECT d.*, p.project_name FROM design_note d LEFT JOIN project p ON d.project_id = p.id ${where} ORDER BY d.${sf} ${so} LIMIT ? OFFSET ?`,
        [...params, parseInt(pageSize), parseInt(offset)]
      )

      res.json(Response.success({ list, pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total: cnt.total, totalPages: Math.ceil(cnt.total / pageSize) } }))
    } catch (e) { next(e) }
  }

  async detail(req, res, next) {
    try {
      const [r] = await db.query(
        'SELECT d.*, p.project_name FROM design_note d LEFT JOIN project p ON d.project_id = p.id WHERE d.id = ? AND d.is_delete = 0',
        [req.params.id]
      )
      if (!r) return res.status(404).json(Response.notFound('记录不存在'))
      res.json(Response.success(r))
    } catch (e) { next(e) }
  }

  async create(req, res, next) {
    try {
      const v = validate(req.body).required(['title']).maxLength('title', 200)
      if (!v.validate()) return res.status(400).json(Response.badRequest(v.getFirstError()))

      const { title, content, correct_practice, note_type, severity, stage, project_id, category, craft, ip, images, attachments, remark } = req.body
      const sev = VALID_SEVERITY.includes(severity) ? severity : 'important'
      const result = await db.query(
        'INSERT INTO design_note (title, content, correct_practice, note_type, severity, stage, project_id, category, craft, ip, images, attachments, remark, create_user_id, create_time, update_time, is_delete) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0)',
        [title, content || null, correct_practice || null, note_type || null, sev, stage || null, project_id || null, category || null, craft || null, ip || null, images || null, attachments || null, remark || null, req.user?.id]
      )
      res.json(Response.success({ id: result.insertId }, '创建成功'))
    } catch (e) { next(e) }
  }

  async update(req, res, next) {
    try {
      const { title, content, correct_practice, note_type, severity, stage, project_id, category, craft, ip, images, attachments, remark } = req.body
      const sev = VALID_SEVERITY.includes(severity) ? severity : 'important'
      // 表单全量提交：直接 SET，空值落 NULL（stage/project_id 可清空）
      const r = await db.query(
        `UPDATE design_note SET
          title=COALESCE(?,title),
          content=COALESCE(?,content),
          correct_practice=COALESCE(?,correct_practice),
          note_type=COALESCE(?,note_type),
          severity=?,
          stage=?,
          project_id=?,
          category=COALESCE(NULLIF(?, ''),category),
          craft=COALESCE(NULLIF(?, ''),craft),
          ip=COALESCE(NULLIF(?, ''),ip),
          images=COALESCE(NULLIF(?, ''),images),
          attachments=COALESCE(NULLIF(?, ''),attachments),
          remark=COALESCE(?,remark),
          update_time=NOW()
        WHERE id=? AND is_delete=0`,
        [title, content, correct_practice, note_type, sev, stage || null, project_id || null, category || '', craft || '', ip || '', images || '', attachments || '', remark, req.params.id]
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
