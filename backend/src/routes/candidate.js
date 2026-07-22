/**
 * 灵感采集候选路由
 */
const express = require('express')
const router = express.Router()
const candidateController = require('../controllers/CandidateController')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

// 查看：viewer+
router.get('/counts', candidateController.counts)          // 须在 /:id 之前
router.get('/crawl-runs', candidateController.crawlRuns)   // 采集批次列表
router.get('/crawl/:runId', candidateController.crawlStatus)
router.get('/xhs-cookie-status', candidateController.xhsCookieStatus)
router.get('/', candidateController.list)
router.get('/:id', candidateController.detail)

// 复核操作：editor+
router.post('/', requireRole('editor'), candidateController.createManual)
router.post('/crawl', requireRole('editor'), candidateController.startCrawl)
router.post('/xhs-login', requireRole('editor'), candidateController.xhsLogin)
router.post('/score-pending', requireRole('editor'), candidateController.scorePending)
router.post('/batch-adopt', requireRole('editor'), candidateController.batchAdopt)
router.post('/batch-reject', requireRole('editor'), candidateController.batchReject)
router.post('/:id/adopt', requireRole('editor'), candidateController.adopt)
router.post('/:id/reject', requireRole('editor'), candidateController.reject)
router.post('/:id/restore', requireRole('editor'), candidateController.restore)

module.exports = router
