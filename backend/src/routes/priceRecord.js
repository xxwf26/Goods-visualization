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
router.get('/quote-review', controller.quoteReview)
router.get('/options', controller.options)
router.get('/trash', requireRole('admin'), controller.listTrash)
router.get('/:id', controller.detail)
router.post('/', requireRole('editor'), controller.create)
router.put('/:id', requireRole('editor'), controller.update)
router.put('/:id/restore', requireRole('admin'), controller.restore)
router.delete('/batch', requireRole('admin'), controller.batchDelete)
router.delete('/:id/purge', requireRole('admin'), controller.purge)
router.delete('/:id', requireRole('admin'), controller.delete)

module.exports = router