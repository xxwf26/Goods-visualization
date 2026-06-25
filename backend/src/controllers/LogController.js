/**
 * 操作日志 Controller（审计查询，仅管理员）
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

class LogController {
  /**
   * 日志列表（分页 + 筛选）
   * GET /api/logs?module=&username=&status=&start_date=&end_date=&keyword=
   */
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 20, module: mod, username, status, start_date, end_date, keyword } = req.query
      const offset = (page - 1) * pageSize

      let where = 'WHERE 1=1'
      const params = []
      if (mod) { where += ' AND module = ?'; params.push(mod) }
      if (username) { where += ' AND username LIKE ?'; params.push(`%${username}%`) }
      if (status !== undefined && status !== '') { where += ' AND status = ?'; params.push(parseInt(status, 10)) }
      if (start_date) { where += ' AND create_time >= ?'; params.push(start_date) }
      if (end_date) { where += ' AND create_time <= ?'; params.push(end_date + ' 23:59:59') }
      if (keyword) {
        where += ' AND (operation LIKE ? OR url LIKE ? OR params LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      const [countRow] = await db.query(`SELECT COUNT(*) as total FROM log ${where}`, params)
      const total = countRow.total

      const list = await db.query(
        `SELECT id, user_id, username, operation, module, method, url, ip, params, status, error_msg, create_time
         FROM log ${where} ORDER BY create_time DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(pageSize, 10), parseInt(offset, 10)]
      )

      res.json(Response.success({
        list,
        pagination: { page: parseInt(page, 10), pageSize: parseInt(pageSize, 10), total, totalPages: Math.ceil(total / pageSize) }
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 模块选项（去重，供筛选下拉）
   * GET /api/logs/modules
   */
  async modules(req, res, next) {
    try {
      const rows = await db.query(`SELECT DISTINCT module FROM log WHERE module IS NOT NULL AND module <> '' ORDER BY module`)
      res.json(Response.success(rows.map(r => r.module)))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new LogController()
