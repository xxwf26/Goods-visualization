/**
 * 全局检索路由（跨模块，登录可用）
 */
const express = require('express')
const router = express.Router()
const searchController = require('../controllers/SearchController')
const { authMiddleware } = require('../middleware/auth')
const { rateLimit } = require('../middleware/rateLimit')

router.use(authMiddleware)

// 普通搜索限流：30次/分钟（按IP），防止高频请求拖慢DB；正常使用不会触发
router.get('/', rateLimit({ windowMs: 60000, max: 30 }), searchController.search.bind(searchController))
router.post('/recommend', rateLimit({ windowMs: 60000, max: 5 }), searchController.recommend.bind(searchController))

module.exports = router
