/**
 * 权限指令扩展 - 用于表单元素禁用状态控制
 */

import { useUserStore } from '@/stores/user'
import { PERMISSION_ROLES } from '@/constants/permission'

/**
 * v-hasPermission 指令
 * 权限不满足时禁用元素
 * 用法: v-hasPermission="'goods:create'"
 */
export const hasPermissionDirective = {
  mounted(el, binding) {
    const { value, modifiers } = binding
    const userStore = useUserStore()

    // 管理员拥有所有权限
    if (userStore.role === PERMISSION_ROLES.ADMIN) {
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
      // 禁用元素
      el.disabled = true
      el.classList.add('is-disabled-permission')
    }
  }
}

/**
 * v-can 指令 - 简化的权限控制
 * 用法: v-can="'create:goods'"
 */
export const canDirective = {
  mounted(el, binding) {
    const { value } = binding
    const userStore = useUserStore()

    const [action, resource] = value.split(':')
    if (!action || !resource) {
      console.warn('v-can 指令格式错误，应为 "action:resource"')
      return
    }

    const permission = `${resource}:${action}`

    // 管理员拥有所有权限
    if (userStore.role !== PERMISSION_ROLES.ADMIN && !userStore.hasPermission(permission)) {
      el.style.display = 'none'
    }
  }
}

/**
 * 注册所有权限指令
 * @param {import('vue').App} app
 */
export function registerAllDirectives(app) {
  app.directive('hasPermission', hasPermissionDirective)
  app.directive('can', canDirective)
}
