/**
 * 灵感收藏夹路由
 */
const express = require('express')
const router = express.Router()
const inspirationController = require('../controllers/InspirationController')
const { authMiddleware } = require('../middleware/auth')

// 所有收藏夹接口都需要认证
router.use(authMiddleware)

// 收藏夹列表
router.get('/', inspirationController.folders)

// 新增收藏夹
router.post('/', inspirationController.createFolder)

module.exports = router
