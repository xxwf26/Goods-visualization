/**
 * 统计路由
 */
const express = require('express')
const router = express.Router()
const statisticsController = require('../controllers/StatisticsController')
const { authMiddleware } = require('../middleware/auth')

// 所有统计接口都需要认证
router.use(authMiddleware)

// 价格统计分析
router.get('/price', statisticsController.priceAnalysis)

// 参考价格
router.get('/reference-price', statisticsController.referencePrice)

// 仪表盘统计
router.get('/dashboard', statisticsController.dashboard)

module.exports = router
