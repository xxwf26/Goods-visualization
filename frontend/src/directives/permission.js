import { useUserStore } from '@/stores/user'
import { PERMISSION_ROLES } from '@/constants/permission'

/**
 * 权限指令 - 用于模板中控制元素显示和权限拦截
 */

/**
 * v-permission 指令
 * 权限不满足时显示配置的元素
 * 用法: v-permission="'goods:create'" 或 v-permission="['goods:create', 'goods:edit']"
 */
export const permissionDirective = {
  mounted(el, binding) {
    const { value, modifiers } = binding
    const userStore = useUserStore()

    // 管理员拥有所有权限
    if (userStore.role === PERMISSION_ROLES.ADMIN || userStore.role === 'super_admin') {
      return
    }

    // 获取权限要求
    const permissions = Array.isArray(value) ? value : [value]

    // 检查是否有权限
    let hasPermission = false
    if (modifiers.all) {
      // 需要所有权限
      hasPermission = userStore.hasAllPermissions(permissions)
    } else {
      // 只要有任一权限即可
      hasPermission = userStore.hasAnyPermission(permissions)
    }

    if (!hasPermission) {
      // 隐藏元素
      if (el.style.display !== 'none') {
        el.dataset.originalDisplay = el.style.display || ''
      }
      el.style.display = 'none'
    }
  },

  unmounted(el) {
    // 恢复原始 display
    if (el.dataset.originalDisplay !== undefined) {
      el.style.display = el.dataset.originalDisplay
    }
  }
}

/**
 * v-if-permission 指令
 * 权限不满足时不渲染元素
 * 用法: v-if-permission="'goods:create'"
 */
export const ifPermissionDirective = {
  mounted(el, binding) {
    const { value, modifiers } = binding
    const userStore = useUserStore()

    // 管理员拥有所有权限
    if (userStore.role === PERMISSION_ROLES.ADMIN || userStore.role === 'super_admin') {
      return
    }

    // 获取权限要求
    const permissions = Array.isArray(value) ? value : [value]

    // 检查是否有权限
    let hasPermission = false
    if (modifiers.all) {
      hasPermission = userStore.hasAllPermissions(permissions)
    } else {
      hasPermission = userStore.hasAnyPermission(permissions)
    }

    if (!hasPermission) {
      // 移除元素
      el.parentNode && el.parentNode.removeChild(el)
    }
  }
}

/**
 * v-role 指令
 * 限制元素只对特定角色可见
 * 用法: v-role="['admin', 'editor']"
 */
export const roleDirective = {
  mounted(el, binding) {
    const { value } = binding
    const userStore = useUserStore()

    const roles = Array.isArray(value) ? value : [value]
    if (!roles.includes(userStore.role)) {
      el.style.display = 'none'
    }
  }
}

/**
 * 注册权限指令
 * @param {import('vue').App} app
 */
export function registerPermissionDirective(app) {
  app.directive('permission', permissionDirective)
  app.directive('if-permission', ifPermissionDirective)
  app.directive('role', roleDirective)
}
