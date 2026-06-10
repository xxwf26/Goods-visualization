const jwt = require('jsonwebtoken')
const config = require('../config')

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null
      })
    }

    const token = authHeader.substring(7)

    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '令牌已过期',
        data: null
      })
    }

    return res.status(401).json({
      code: 401,
      message: '无效的认证令牌',
      data: null
    })
  }
}

/**
 * 权限中间件工厂函数
 * 需求规则（第十节）:
 *   - viewer（普通查看）: 只能查看和搜索，不可编辑
 *   - editor（编辑权限）: 可新增、编辑、上传，不可删除
 *   - admin/super_admin（管理员）: 全部权限，可删除
 *
 * 用法:
 *   router.post('/', authMiddleware, requireRole('editor'), controller.create)
 *   router.delete('/:id', authMiddleware, requireRole('admin'), controller.delete)
 *
 * @param {string} minimumRole - 最低需要的角色: 'viewer' | 'editor' | 'admin'
 * @returns {Function} Express 中间件
 */
const requireRole = (minimumRole) => {
  const roleHierarchy = {
    'viewer': 1,
    'editor': 2,
    'admin': 3,
    'super_admin': 4
  }

  return (req, res, next) => {
    const userRoles = req.user?.role_codes || []

    // 计算用户最高角色等级
    let maxLevel = 0
    for (const role of userRoles) {
      const level = roleHierarchy[role] || 0
      if (level > maxLevel) maxLevel = level
    }

    const requiredLevel = roleHierarchy[minimumRole] || 0

    if (maxLevel < requiredLevel) {
      return res.status(403).json({
        code: 403,
        message: `需要${minimumRole}及以上权限`,
        data: null
      })
    }

    next()
  }
}

/**
 * 权限码检查中间件工厂函数
 * 用于按钮级别的细粒度权限控制
 *
 * @param {string} permissionCode - 权限码，如 'project:delete', 'supplier:edit'
 */
const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    // 管理员直接通过
    const userRoles = req.user?.role_codes || []
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
      return next()
    }

    // 简化: 按角色映射权限
    const editorPermissions = [
      'project:view', 'project:search', 'project:create', 'project:edit',
      'price:view', 'price:search',
      'inspiration:view', 'inspiration:search', 'inspiration:create', 'inspiration:edit', 'inspiration:upload',
      'supplier:view', 'supplier:search', 'supplier:detail',
      'tag:view'
    ]

    const viewerPermissions = [
      'project:view', 'project:search',
      'price:view', 'price:search',
      'inspiration:view', 'inspiration:search',
      'supplier:view', 'supplier:search', 'supplier:detail'
    ]

    if (userRoles.includes('editor') && editorPermissions.includes(permissionCode)) {
      return next()
    }

    if (userRoles.includes('viewer') && viewerPermissions.includes(permissionCode)) {
      return next()
    }

    return res.status(403).json({
      code: 403,
      message: `无权限执行此操作 (${permissionCode})`,
      data: null
    })
  }
}

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
}

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret)
}

module.exports = {
  authMiddleware,
  requireRole,
  requirePermission,
  generateToken,
  verifyToken
}
