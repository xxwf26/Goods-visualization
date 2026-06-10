/**
 * 批量导入路由
 */
const express = require('express')
const router = express.Router()
const ImportController = require('../controllers/ImportController')
const { authMiddleware, requireRole } = require('../middleware/auth')
const upload = require('../middleware/upload')

// 所有导入接口都需要认证
router.use(authMiddleware)

// 批量导入需要管理员权限（需求：批量导入数据是管理员权限）
router.post('/parse', requireRole('admin'), upload.single('file'), ImportController.parseExcel)
router.post('/preview', requireRole('admin'), ImportController.previewImport)
router.post('/projects', requireRole('admin'), ImportController.importProjects)
router.post('/suppliers', requireRole('admin'), ImportController.importSuppliers)
router.post('/prices', requireRole('admin'), ImportController.importPrices)

// 下载导入模板: viewer+
router.get('/template/:type', ImportController.downloadTemplate)

module.exports = router
