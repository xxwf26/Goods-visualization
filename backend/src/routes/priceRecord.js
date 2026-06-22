/**
 * 周边价格登记 API 路由
 */
const express = require('express')
const router = express.Router()
const controller = require('../controllers/PriceRecordController')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', controller.list)
router.get('/query', controller.priceQuery)
router.get('/options', controller.options)
router.get('/:id', controller.detail)
router.post('/', requireRole('editor'), controller.create)
router.put('/:id', requireRole('editor'), controller.update)
router.delete('/:id', requireRole('admin'), controller.delete)

module.exports = router