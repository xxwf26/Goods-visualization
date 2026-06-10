/**
 * 上传路由
 */
const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/UploadController')
const upload = require('../middleware/upload')
const { authMiddleware, requireRole } = require('../middleware/auth')

// 所有上传接口都需要认证 + 编辑权限
router.use(authMiddleware)

// 上传操作: editor+
router.post('/image', requireRole('editor'), upload.single('file'), uploadController.image)
router.post('/images', requireRole('editor'), upload.array('files', 20), uploadController.images)
router.post('/file', requireRole('editor'), upload.single('file'), uploadController.file)
router.post('/base64', requireRole('editor'), uploadController.base64)

// 删除文件: admin+
router.delete('/:filename', requireRole('admin'), uploadController.delete)

module.exports = router
