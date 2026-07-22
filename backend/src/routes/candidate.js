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
router.get('/', candidateController.list)
router.get('/:id', candidateController.detail)

// 复核操作：editor+
router.post('/', requireRole('editor'), candidateController.createManual)
router.post('/:id/adopt', requireRole('editor'), candidateController.adopt)
router.post('/:id/reject', requireRole('editor'), candidateController.reject)
router.post('/:id/restore', requireRole('editor'), candidateController.restore)

module.exports = router
