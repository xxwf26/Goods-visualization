/**
 * 操作日志 Controller（审计查询，仅管理员）
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

// 支持回撤的资源表白名单（与 auditLog 的 RESOURCE_TABLES 一致）
const UNDOABLE_TABLES = ['project', 'price_record', 'inspiration', 'design_note', 'supplier', 'tag']

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
        `SELECT id, user_id, username, operation, module, method, url, ip, params, status, error_msg, create_time,
                resource_table, resource_id, undone
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
   * 回撤一条操作（按逆操作还原）
   * POST /api/logs/:id/undo
   * - DELETE 软删 → 恢复 is_delete=0
   * - POST 新增 → 软删新建记录 is_delete=1
   * - PUT/PATCH 修改 → 用 before_data 还原旧值
   */
  async undo(req, res, next) {
    try {
      const { id } = req.params
      const [log] = await db.query('SELECT * FROM log WHERE id = ?', [id])
      if (!log) return res.status(404).json(Response.notFound('日志不存在'))
      if (log.undone) return res.status(400).json(Response.badRequest('该操作已回撤，不可重复回撤'))
      if (!log.resource_table || !log.resource_id) {
        return res.status(400).json(Response.badRequest('该操作不支持回撤（未记录资源定位）'))
      }
      if (!UNDOABLE_TABLES.includes(log.resource_table)) {
        return res.status(400).json(Response.badRequest('该资源类型不支持回撤'))
      }

      const table = log.resource_table // 白名单已校验，可安全拼接
      const rid = log.resource_id
      let msg = ''

      if (log.method === 'DELETE') {
        const r = await db.query(`UPDATE \`${table}\` SET is_delete = 0, update_time = NOW() WHERE id = ?`, [rid])
        if (r.affectedRows === 0) return res.status(404).json(Response.notFound('原记录已不存在，无法恢复'))
        msg = '已恢复删除的记录'
      } else if (log.method === 'POST') {
        const r = await db.query(`UPDATE \`${table}\` SET is_delete = 1, update_time = NOW() WHERE id = ?`, [rid])
        if (r.affectedRows === 0) return res.status(404).json(Response.notFound('新建的记录已不存在'))
        msg = '已撤销新增（记录已标记删除）'
      } else if (log.method === 'PUT' || log.method === 'PATCH') {
        if (!log.before_data) return res.status(400).json(Response.badRequest('该修改未记录操作前数据，无法回撤'))
        let old
        try { old = JSON.parse(log.before_data) } catch { return res.status(400).json(Response.badRequest('操作前数据已损坏')) }
        // 排除主键与时间列（update_time 用 NOW()，create_time 不动）
        const cols = Object.keys(old).filter(k => k !== 'id' && k !== 'create_time' && k !== 'update_time')
        if (!cols.length) return res.status(400).json(Response.badRequest('操作前数据为空'))
        // before_data 里 datetime 被 JSON.stringify 成 ISO 串，MySQL datetime 列不认，需转回 YYYY-MM-DD HH:MM:SS
        const toVal = (v) => {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            return v.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '')
          }
          return v
        }
        const setClause = cols.map(k => `\`${k}\` = ?`).join(', ')
        const r = await db.query(`UPDATE \`${table}\` SET ${setClause}, update_time = NOW() WHERE id = ?`, [...cols.map(k => toVal(old[k])), rid])
        if (r.affectedRows === 0) return res.status(404).json(Response.notFound('原记录已不存在，无法还原'))
        msg = '已还原修改前的数据'
      } else {
        return res.status(400).json(Response.badRequest('该操作类型不支持回撤'))
      }

      // 标记原日志已回撤
      await db.query('UPDATE log SET undone = 1 WHERE id = ?', [id])
      // 记录一条回撤审计日志（undo 接口本身已被 auditLog 跳过，避免误标"新增"）
      try {
        const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 50)
        const ua = (req.headers['user-agent'] || '').slice(0, 500)
        await db.query(
          `INSERT INTO log (user_id, username, operation, module, method, url, ip, user_agent, params, result, status, create_time)
           VALUES (?, ?, ?, '操作日志', 'POST', ?, ?, ?, ?, NULL, 1, NOW())`,
          [req.user?.id, req.user?.username, `回撤 #${id}(${log.operation})`, `/api/logs/${id}/undo`, ip, ua, JSON.stringify({ undoLogId: parseInt(id, 10) })]
        )
      } catch (e) { /* 审计失败不影响回撤 */ }

      res.json(Response.success({ undone: true }, msg))
    } catch (e) {
      next(e)
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
