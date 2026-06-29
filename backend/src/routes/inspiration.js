/**
 * 外部灵感路由
 */
const express = require('express')
const router = express.Router()
const inspirationController = require('../controllers/InspirationController')
const { authMiddleware, requireRole } = require('../middleware/auth')
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
router.get('/folders', inspirationController.folders)
router.get('/:id', inspirationController.detail)

// 新增/编辑/收藏: editor+
router.post('/', requireRole('editor'), inspirationController.create)
router.post('/check-links', requireRole('editor'), inspirationController.checkLinksBatch)
router.post('/:id/check-link', requireRole('editor'), inspirationController.checkLink)
router.post('/:id/analyze', requireRole('editor'), inspirationController.analyzeImages)
router.put('/:id/detail', requireRole('editor'), inspirationController.updateDetail)
router.post('/:id/collect', requireRole('editor'), inspirationController.collect)
router.post('/:id/uncollect', requireRole('editor'), inspirationController.uncollect)
router.put('/:id', requireRole('editor'), inspirationController.update)

// 删除: admin+
router.delete('/:id', requireRole('admin'), inspirationController.delete)

module.exports = router
