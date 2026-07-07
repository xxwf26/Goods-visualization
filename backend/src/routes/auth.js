/**
 * 认证路由
 */
const express = require('express')
const router = express.Router()
const authController = require('../controllers/AuthController')
const { authMiddleware, requireRole } = require('../middleware/auth')
const loginLimiter = require('../middleware/loginLimiter')

// 用户登录（公开，加 IP 限流防爆破）
router.post('/login', loginLimiter, authController.login)

// 获取当前用户信息（需认证）
router.get('/current', authMiddleware, authController.current)

// 修改密码（需认证）
router.post('/change-password', authMiddleware, authController.changePassword)

// 获取用户菜单权限（需认证）
router.get('/menus', authMiddleware, authController.getMenus)

// 获取用户按钮权限（需认证）
router.get('/permissions', authMiddleware, authController.getPermissions)

// 用户管理（管理员专属）
router.get('/users', authMiddleware, requireRole('admin'), authController.userList)
router.post('/users', authMiddleware, requireRole('admin'), authController.createUser)
router.put('/users/:id', authMiddleware, requireRole('admin'), authController.updateUser)
router.delete('/users/:id', authMiddleware, requireRole('admin'), authController.deleteUser)

module.exports = router
