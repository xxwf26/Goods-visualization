/**
 * 系统配置路由
 */
const express = require('express')
const router = express.Router()
const controller = require('../controllers/SettingController')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

// 获取单个配置（登录用户均可）
router.get('/:key', controller.get)

// 获取/更新所有配置（仅管理员）
router.get('/', requireRole('admin'), controller.list)
router.put('/', requireRole('admin'), controller.update)

module.exports = router
