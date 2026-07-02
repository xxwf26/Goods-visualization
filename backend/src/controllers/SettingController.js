/**
 * 系统配置 Controller
 * 管理员可编辑 AI 提示词、访客热门词等全局配置
 */
const { Response } = require('../utils/response')
const db = require('../config/database')

class SettingController {
  /** GET /api/settings — 获取所有配置（管理员） */
  async list(req, res, next) {
    try {
      const rows = await db.query('SELECT setting_key, setting_value, setting_desc FROM system_setting ORDER BY id')
      const result = {}
      for (const r of rows) result[r.setting_key] = r.setting_value
      res.json(Response.success(result))
    } catch (e) { next(e) }
  }

  /** PUT /api/settings — 批量更新配置（管理员） */
  async update(req, res, next) {
    try {
      const { settings } = req.body
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json(Response.badRequest('请提供 settings 对象'))
      }
      for (const [key, value] of Object.entries(settings)) {
        await db.query(
          'INSERT INTO system_setting (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [key, value, value]
        )
      }
      res.json(Response.success(null, '配置已更新'))
    } catch (e) { next(e) }
  }

  /** GET /api/settings/:key — 获取单个配置（登录用户均可，用于前端读取热门词等） */
  async get(req, res, next) {
    try {
      const { key } = req.params
      const [row] = await db.query('SELECT setting_value FROM system_setting WHERE setting_key = ?', [key])
      res.json(Response.success(row ? row.setting_value : null))
    } catch (e) { next(e) }
  }
}

module.exports = new SettingController()
