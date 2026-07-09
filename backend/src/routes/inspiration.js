/**
 * 外部灵感路由
 */
const express = require('express')
const router = express.Router()
const inspirationController = require('../controllers/InspirationController')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { rateLimit } = require('../middleware/rateLimit')
const MetaFetcher = require('../services/MetaFetcher')

// 所有接口都需要认证
router.use(authMiddleware)

// 抓取链接元数据（自动填标题/封面）
router.post('/fetch-meta', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ code: 400, message: '请提供URL' })
    const meta = await MetaFetcher.fetch(url)
    res.json({ code: 200, data: meta })
  } catch (e) {
    res.json({ code: 200, data: { title: '', description: '', image: '', platform: '其他' }, message: '抓取失败，请手动填写' })
  }
})

// 查看: viewer+
router.get('/', inspirationController.list)
// 回收站列表（须在 /:id 之前，否则 trash 被当成 id 匹配）：admin
router.get('/trash', requireRole('admin'), inspirationController.listTrash)
router.get('/:id', inspirationController.detail)

// 新增/编辑: editor+
router.post('/', requireRole('editor'), inspirationController.create)
router.post('/check-links', requireRole('editor'), inspirationController.checkLinksBatch)
router.post('/:id/check-link', requireRole('editor'), inspirationController.checkLink)
router.post('/:id/analyze', requireRole('editor'), rateLimit({ windowMs: 60000, max: 3 }), inspirationController.analyzeImages)
router.post('/:id/refresh-snapshot', requireRole('editor'), inspirationController.refreshSnapshot)
router.put('/:id/detail', requireRole('editor'), inspirationController.updateDetail)
router.put('/:id/link-status', requireRole('editor'), inspirationController.setLinkStatus)
router.put('/:id/link', requireRole('editor'), inspirationController.updateLink)
router.put('/:id', requireRole('editor'), inspirationController.update)

// 删除 / 回收站恢复 / 彻底删除: admin+
router.put('/:id/restore', requireRole('admin'), inspirationController.restore)
router.delete('/:id/purge', requireRole('admin'), inspirationController.purge)
router.delete('/:id', requireRole('admin'), inspirationController.delete)

module.exports = router
