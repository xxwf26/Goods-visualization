/**
 * 全局检索路由（跨模块，登录可用）
 */
const express = require('express')
const router = express.Router()
const searchController = require('../controllers/SearchController')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', searchController.search.bind(searchController))
router.post('/recommend', searchController.recommend.bind(searchController))

module.exports = router
