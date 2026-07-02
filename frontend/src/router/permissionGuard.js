/**
 * 权限路由守卫 - 基于角色的路由权限控制
 */

import { useUserStore } from '@/stores/user'
import { PERMISSION_ROLES } from '@/constants/permission'
import { ElMessage } from 'element-plus'

/**
 * 路由权限配置
 * 定义哪些角色可以访问哪些路由
 */
const routePermissionConfig = {
  // 需要管理员权限的路由
  adminRoutes: [
    '/system/permission',
    '/system/logs',
    '/system/traffic',
    '/system/settings',
    '/import'
  ],
  // 需要编辑或管理员权限的路由
  editorRoutes: [
    '/system/tags'
  ]
}

/**
 * 检查路由权限
 * @param {string} path - 路由路径
 * @param {string} role - 用户角色
 * @returns {boolean}
 */
export function checkRoutePermission(path, role) {
  // 管理员/超级管理员可以访问所有路由
  if (role === PERMISSION_ROLES.ADMIN || role === 'super_admin') {
    return true
  }

  // 检查是否需要管理员权限
  const requiresAdmin = routePermissionConfig.adminRoutes.some(route =>
    path.startsWith(route)
  )
  if (requiresAdmin) {
    return false
  }

  // 检查是否需要编辑权限
  const requiresEditor = routePermissionConfig.editorRoutes.some(route =>
    path.startsWith(route)
  )
  if (requiresEditor && role === PERMISSION_ROLES.VIEWER) {
    return false
  }

  return true
}

/**
 * 路由权限守卫
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @param {import('vue-router').NavigateFunction} next
 * @param {import('vue-router').RawLocation} redirect
 */
export function createPermissionGuard(to, from, next, redirect) {
  const userStore = useUserStore()

  // 检查路由权限
  if (!checkRoutePermission(to.path, userStore.role)) {
    ElMessage.warning('您没有访问该页面的权限')
    return redirect || '/'
  }

  return true
}
