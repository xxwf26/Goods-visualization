import { useUserStore } from '@/stores/user'
import { PERMISSION_ROLES } from '@/constants/permission'

/**
 * 权限工具函数 - 用于组件和逻辑中判断权限
 */

/**
 * 检查是否具有某个权限
 * @param {string} permission - 权限码，如 'goods:create'
 * @returns {boolean}
 */
export function hasPermission(permission) {
  const userStore = useUserStore()
  return userStore.hasPermission(permission)
}

/**
 * 检查是否具有所有指定的权限
 * @param {string[]} permissions - 权限码数组
 * @returns {boolean}
 */
export function hasAllPermissions(permissions) {
  const userStore = useUserStore()
  return userStore.hasAllPermissions(permissions)
}

/**
 * 检查是否具有任一指定的权限
 * @param {string[]} permissions - 权限码数组
 * @returns {boolean}
 */
export function hasAnyPermission(permissions) {
  const userStore = useUserStore()
  return userStore.hasAnyPermission(permissions)
}

/**
 * 检查是否为管理员
 * @returns {boolean}
 */
export function isAdmin() {
  const userStore = useUserStore()
  return userStore.role === PERMISSION_ROLES.ADMIN
}

/**
 * 检查是否为编辑用户
 * @returns {boolean}
 */
export function isEditor() {
  const userStore = useUserStore()
  return userStore.role === PERMISSION_ROLES.EDITOR
}

/**
 * 检查是否为普通查看用户
 * @returns {boolean}
 */
export function isViewer() {
  const userStore = useUserStore()
  return userStore.role === PERMISSION_ROLES.VIEWER
}

/**
 * 权限判断钩子 - 兼容 Vue Options API 和 Composition API
 * @returns {object} 权限判断方法
 */
export function usePermission() {
  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isEditor,
    isViewer
  }
}

/**
 * 特定业务权限判断
 */
export const permissionChecker = {
  // 商品/灵感权限
  goods: {
    canView: () => hasAnyPermission(['goods:view']),
    canCreate: () => hasPermission('goods:create'),
    canEdit: () => hasPermission('goods:edit'),
    canDelete: () => hasPermission('goods:delete'),
    canEditTag: () => hasAnyPermission(['goods:editTag', 'tag:edit', 'admin']),
    canEditScreenshot: () => hasAnyPermission(['goods:editScreenshot', 'goods:edit']),
    canEditRemark: () => hasAnyPermission(['goods:editRemark', 'goods:edit']),
    canEditPrice: () => hasPermission('goods:editPrice'),
    canImport: () => hasPermission('goods:import'),
    canExport: () => hasPermission('goods:export')
  },
  // 供应商权限
  supplier: {
    canView: () => hasAnyPermission(['supplier:view']),
    canCreate: () => hasPermission('supplier:create'),
    canEdit: () => hasPermission('supplier:edit'),
    canDelete: () => hasPermission('supplier:delete')
  },
  // 标签权限
  tag: {
    canView: () => hasAnyPermission(['tag:view']),
    canCreate: () => hasPermission('tag:create'),
    canEdit: () => hasPermission('tag:edit'),
    canDelete: () => hasPermission('tag:delete'),
    canManage: () => hasPermission('tag:manage')
  },
  // 用户管理权限
  user: {
    canView: () => hasPermission('user:view'),
    canCreate: () => hasPermission('user:create'),
    canEdit: () => hasPermission('user:edit'),
    canDelete: () => hasPermission('user:delete'),
    canManage: () => hasPermission('user:manage')
  }
}
