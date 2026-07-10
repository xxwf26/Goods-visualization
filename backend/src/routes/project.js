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
router.get('/options', projectController.options)
 router.get('/export', projectController.export)
router.get('/trash', requireRole('admin'), projectController.listTrash)
router.get('/:id', projectController.detail)

// 新增/编辑: editor+
router.post('/', requireRole('editor'), projectController.create)
router.post('/import', requireRole('editor'), projectController.import)
router.put('/:id', requireRole('editor'), projectController.update)
router.put('/:id/restore', requireRole('admin'), projectController.restore)

// 删除: admin+
router.delete('/:id/purge', requireRole('admin'), projectController.purge)
router.delete('/:id', requireRole('admin'), projectController.delete)

module.exports = router
