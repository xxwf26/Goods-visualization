/**
 * 标签路由
 */
const express = require('express')
const router = express.Router()
const tagController = require('../controllers/TagController')
const { authMiddleware, requireRole } = require('../middleware/auth')

// 所有接口都需要认证
router.use(authMiddleware)

// 查看: viewer+
router.get('/', tagController.list)
router.get('/tree', tagController.tree)
router.get('/:id', tagController.detail)

// 新增/编辑: editor+
router.post('/', requireRole('editor'), tagController.create)
router.post('/batch', requireRole('editor'), tagController.batchImport)
router.put('/:id', requireRole('editor'), tagController.update)

// 删除: admin+
router.delete('/:id', requireRole('admin'), tagController.delete)

module.exports = router
