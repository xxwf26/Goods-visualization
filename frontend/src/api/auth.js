/**
 * 认证 API 服务
 */
import request from './request'

/**
 * 用户登录
 * @param {Object} data - { username, password }
 */
export function login(data) {
  return request.post('/auth/login', data)
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
  return request.get('/auth/current')
}

/**
 * 获取用户菜单权限
 */
export function getMenus() {
  return request.get('/auth/menus')
}

/**
 * 获取用户按钮权限
 */
export function getPermissions() {
  return request.get('/auth/permissions')
}

/**
 * 修改密码
 * @param {Object} data - { oldPassword, newPassword }
 */
export function changePassword(data) {
  return request.post('/auth/change-password', data)
}

/**
 * 获取用户列表（管理员）
 * @param {Object} params - 查询参数
 */
export function getUsers(params) {
  return request.get('/auth/users', { params })
}

/**
 * 新增用户（管理员）
 * @param {Object} data - 用户数据
 */
export function createUser(data) {
  return request.post('/auth/users', data)
}

/**
 * 更新用户（管理员）
 * @param {number} id - 用户ID
 * @param {Object} data - 用户数据
 */
export function updateUser(id, data) {
  return request.put(`/auth/users/${id}`, data)
}

/**
 * 删除用户（管理员）
 * @param {number} id - 用户ID
 */
export function deleteUser(id) {
  return request.delete(`/auth/users/${id}`)
}

export default {
  login,
  getCurrentUser,
  getMenus,
  getPermissions,
  changePassword,
  getUsers,
  createUser,
  updateUser,
  deleteUser
}
