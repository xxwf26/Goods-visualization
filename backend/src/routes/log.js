/**
 * 操作日志路由（仅管理员可查看审计日志）
 */
const express = require('express')
const router = express.Router()
const controller = require('../controllers/LogController')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/', controller.list)
router.get('/modules', controller.modules)
router.post('/:id/undo', controller.undo)

module.exports = router
