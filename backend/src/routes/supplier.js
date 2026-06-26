/**
 * 供应商路由
 */
const express = require('express')
const router = express.Router()
const supplierController = require('../controllers/SupplierController')
const { authMiddleware, requireRole } = require('../middleware/auth')

// 所有接口都需要认证
router.use(authMiddleware)

// 查看: viewer+
router.get('/', supplierController.list)
router.get('/dashboard', supplierController.dashboard)
router.get('/:id', supplierController.detail)

// 评价: editor+（补充参考说明属于编辑权限）
router.post('/:id/evaluate', requireRole('editor'), supplierController.evaluate)

// 新增/编辑: admin+（需求：修改供应商信息是管理员权限）
router.post('/', requireRole('admin'), supplierController.create)
router.put('/:id', requireRole('admin'), supplierController.update)

// 删除: admin+
router.delete('/:id', requireRole('admin'), supplierController.delete)

module.exports = router
