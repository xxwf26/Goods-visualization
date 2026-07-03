/**
 * 认证 & 用户管理 Controller
 */
const { Response } = require('../utils/response')
const db = require('../config/database')
const { generateToken } = require('../utils/jwt')
const { comparePassword, hashPassword } = require('../utils/password')

class AuthController {
  /**
   * 用户登录
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json(Response.badRequest('用户名和密码不能为空'))
      }

      // 查询用户
      const userSql = `
        SELECT u.*, GROUP_CONCAT(r.role_code) as role_codes, GROUP_CONCAT(r.role_name) as role_names
        FROM sys_user u
        LEFT JOIN sys_user_role ur ON u.id = ur.user_id
        LEFT JOIN sys_role r ON ur.role_id = r.id
        WHERE u.username = ? AND u.is_delete = 0 AND u.status = 1
        GROUP BY u.id
      `
      const [user] = await db.query(userSql, [username])

      if (!user) {
        return res.status(401).json(Response.unauthorized('用户名或密码错误'))
      }

      // 验证密码
      const isMatch = await comparePassword(password, user.password)
      if (!isMatch) {
        return res.status(401).json(Response.unauthorized('用户名或密码错误'))
      }

      // 更新登录信息
      await db.query(
        'UPDATE sys_user SET last_login_time = ?, last_login_ip = ? WHERE id = ?',
        [new Date(), req.ip, user.id]
      )

      // 生成 Token
      const tokenPayload = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role_codes: user.role_codes ? user.role_codes.split(',') : [],
        role_names: user.role_names ? user.role_names.split(',') : []
      }
      const token = generateToken(tokenPayload)

      // 移除敏感信息
      delete user.password

      res.json(Response.success({
        token,
        userInfo: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          realName: user.real_name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          department: user.department,
          position: user.position,
          roleCodes: user.role_codes ? user.role_codes.split(',') : [],
          roleNames: user.role_names ? user.role_names.split(',') : []
        }
      }, '登录成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取当前用户信息
   * GET /api/auth/current
   */
  async current(req, res, next) {
    try {
      const userId = req.user.id

      const userSql = `
        SELECT u.id, u.username, u.nickname, u.real_name, u.email, u.phone,
               u.avatar, u.department, u.position, u.last_login_time,
               GROUP_CONCAT(DISTINCT r.role_code) as role_codes,
               GROUP_CONCAT(DISTINCT r.role_name) as role_names
        FROM sys_user u
        LEFT JOIN sys_user_role ur ON u.id = ur.user_id
        LEFT JOIN sys_role r ON ur.role_id = r.id
        WHERE u.id = ? AND u.is_delete = 0
        GROUP BY u.id
      `
      const [user] = await db.query(userSql, [userId])

      if (!user) {
        return res.status(404).json(Response.notFound('用户不存在'))
      }

      res.json(Response.success({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        realName: user.real_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        department: user.department,
        position: user.position,
        lastLoginTime: user.last_login_time,
        roleCodes: user.role_codes ? user.role_codes.split(',') : [],
        roleNames: user.role_names ? user.role_names.split(',') : []
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 修改密码
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body
      const userId = req.user.id

      if (!oldPassword || !newPassword) {
        return res.status(400).json(Response.badRequest('请填写完整信息'))
      }

      if (newPassword.length < 6) {
        return res.status(400).json(Response.badRequest('新密码长度不能少于6位'))
      }

      // 查询用户
      const [user] = await db.query(
        'SELECT password FROM sys_user WHERE id = ? AND is_delete = 0',
        [userId]
      )

      if (!user) {
        return res.status(404).json(Response.notFound('用户不存在'))
      }

      // 验证旧密码
      const isMatch = await comparePassword(oldPassword, user.password)
      if (!isMatch) {
        return res.status(400).json(Response.badRequest('原密码错误'))
      }

      // 更新密码
      const hashedPassword = await hashPassword(newPassword)
      await db.query(
        'UPDATE sys_user SET password = ?, update_time = ? WHERE id = ?',
        [hashedPassword, new Date(), userId]
      )

      res.json(Response.success(null, '密码修改成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取用户菜单权限
   * GET /api/auth/menus
   */
  async getMenus(req, res, next) {
    try {
      const userId = req.user.id

      // 获取用户角色
      const [user] = await db.query(`
        SELECT GROUP_CONCAT(r.role_code) as role_codes
        FROM sys_user u
        JOIN sys_user_role ur ON u.id = ur.user_id
        JOIN sys_role r ON ur.role_id = r.id
        WHERE u.id = ? AND u.is_delete = 0 AND r.is_delete = 0
        GROUP BY u.id
      `, [userId])

      if (!user || !user.role_codes) {
        return res.json(Response.success([]))
      }

      // 获取菜单权限
      const menusSql = `
        SELECT DISTINCT p.id, p.parent_id, p.permission_name, p.permission_code,
               p.permission_type, p.icon, p.path, p.sort
        FROM sys_permission p
        JOIN sys_role_permission rp ON p.id = rp.permission_id
        JOIN sys_role r ON rp.role_id = r.id
        JOIN sys_user_role ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
          AND p.is_delete = 0
          AND p.status = 1
          AND p.permission_type = 'menu'
        ORDER BY p.sort ASC
      `
      const menus = await db.query(menusSql, [userId])

      res.json(Response.success(menus))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取用户按钮权限
   * GET /api/auth/permissions
   */
  async getPermissions(req, res, next) {
    try {
      const userId = req.user.id

      const sql = `
        SELECT DISTINCT p.permission_code, p.id
        FROM sys_permission p
        JOIN sys_role_permission rp ON p.id = rp.permission_id
        JOIN sys_role r ON rp.role_id = r.id
        JOIN sys_user_role ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
          AND p.is_delete = 0
          AND p.status = 1
        ORDER BY p.id
      `
      const permissions = await db.query(sql, [userId])
      const codes = permissions.map(p => p.permission_code)

      res.json(Response.success(codes))
    } catch (error) {
      next(error)
    }
  }

  // ==========================================
  // 用户管理接口（管理员专属）
  // ==========================================

  /**
   * 用户列表
   * GET /api/auth/users
   */
  async userList(req, res, next) {
    try {
      const { page = 1, pageSize = 20, keyword } = req.query
      const offset = (page - 1) * pageSize
      let where = 'WHERE u.is_delete = 0'
      const params = []

      if (keyword) {
        where += ' AND (u.username LIKE ? OR u.nickname LIKE ? OR u.email LIKE ?)'
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
      }

      const countSql = `SELECT COUNT(*) as total FROM sys_user u ${where}`
      const [countResult] = await db.query(countSql, params)

      const listSql = `
        SELECT u.id, u.username, u.nickname, u.real_name, u.email, u.phone,
               u.department, u.position, u.status, u.last_login_time, u.create_time,
               GROUP_CONCAT(DISTINCT r.role_code) as role_codes,
               GROUP_CONCAT(DISTINCT r.role_name) as role_names
        FROM sys_user u
        LEFT JOIN sys_user_role ur ON u.id = ur.user_id
        LEFT JOIN sys_role r ON ur.role_id = r.id
        ${where}
        GROUP BY u.id
        ORDER BY u.create_time DESC
        LIMIT ? OFFSET ?
      `
      const list = await db.query(listSql, [...params, parseInt(pageSize), parseInt(offset)])

      res.json(Response.success({
        list: list.map(u => ({
          id: u.id,
          username: u.username,
          nickname: u.nickname,
          realName: u.real_name,
          email: u.email,
          phone: u.phone,
          department: u.department,
          position: u.position,
          status: u.status === 1 ? 'active' : 'disabled',
          role: u.role_codes ? u.role_codes.split(',')[0] : 'viewer',
          roleCodes: u.role_codes ? u.role_codes.split(',') : [],
          roleNames: u.role_names ? u.role_names.split(',') : [],
          lastLogin: u.last_login_time,
          createTime: u.create_time
        })),
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / pageSize)
        }
      }))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 新增用户
   * POST /api/auth/users
   */
  async createUser(req, res, next) {
    try {
      const { username, password, nickname, email, role } = req.body

      if (!username || !password) {
        return res.status(400).json(Response.badRequest('用户名和密码不能为空'))
      }

      // 检查用户名是否存在
      const [existing] = await db.query('SELECT id FROM sys_user WHERE username = ? AND is_delete = 0', [username])
      if (existing) {
        return res.status(400).json(Response.badRequest('用户名已存在'))
      }

      const hashedPassword = await hashPassword(password)
      const result = await db.query(
        'INSERT INTO sys_user (username, password, nickname, email, status, create_time, update_time, is_delete) VALUES (?, ?, ?, ?, 1, NOW(), NOW(), 0)',
        [username, hashedPassword, nickname || username, email || null]
      )

      // 分配角色
      if (role) {
        const [roleRecord] = await db.query('SELECT id FROM sys_role WHERE role_code = ? AND is_delete = 0', [role])
        if (roleRecord) {
          await db.query('INSERT INTO sys_user_role (user_id, role_id, create_time) VALUES (?, ?, NOW())', [result.insertId, roleRecord.id])
        }
      }

      res.json(Response.success({ id: result.insertId }, '用户创建成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新用户
   * PUT /api/auth/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params
      const { nickname, email, status, role, password } = req.body

      // 更新基本信息
      if (nickname || email || status !== undefined || password) {
        const updates = []
        const params = []

        if (nickname) { updates.push('nickname = ?'); params.push(nickname) }
        if (email) { updates.push('email = ?'); params.push(email) }
        if (status !== undefined) {
          updates.push('status = ?')
          params.push(status === 'active' ? 1 : 0)
        }
        if (password) {
          const hashedPassword = await hashPassword(password)
          updates.push('password = ?')
          params.push(hashedPassword)
        }

        if (updates.length > 0) {
          updates.push('update_time = NOW()')
          params.push(id)
          await db.query(`UPDATE sys_user SET ${updates.join(', ')} WHERE id = ? AND is_delete = 0`, params)
        }
      }

      // 更新角色
      if (role) {
        const [roleRecord] = await db.query('SELECT id FROM sys_role WHERE role_code = ? AND is_delete = 0', [role])
        if (roleRecord) {
          await db.query('DELETE FROM sys_user_role WHERE user_id = ?', [id])
          await db.query('INSERT INTO sys_user_role (user_id, role_id, create_time) VALUES (?, ?, NOW())', [id, roleRecord.id])
        }
      }

      res.json(Response.success(null, '用户更新成功'))
    } catch (error) {
      next(error)
    }
  }

  /**
   * 删除用户
   * DELETE /api/auth/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params
      await db.query('UPDATE sys_user SET is_delete = 1, update_time = NOW() WHERE id = ?', [id])
      res.json(Response.success(null, '用户删除成功'))
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new AuthController()
