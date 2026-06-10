/**
 * 历史项目路由
 */
const express = require('express')
const router = express.Router()
const projectController = require('../controllers/ProjectController')
const { authMiddleware, requireRole } = require('../middleware/auth')

// 所有接口都需要认证
router.use(authMiddleware)

// 查看: viewer+
router.get('/', projectController.list)
router.get('/export', projectController.export)
router.get('/:id', projectController.detail)

// 新增/编辑: editor+
router.post('/', requireRole('editor'), projectController.create)
router.post('/import', requireRole('editor'), projectController.import)
router.put('/:id', requireRole('editor'), projectController.update)

// 删除: admin+
router.delete('/:id', requireRole('admin'), projectController.delete)

module.exports = router
