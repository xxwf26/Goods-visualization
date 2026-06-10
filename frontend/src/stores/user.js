import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null'),
    permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
    menus: JSON.parse(localStorage.getItem('menus') || '[]'),
    role: localStorage.getItem('role') || null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
    isEditor: (state) => state.role === 'editor' || state.role === 'admin',
    isViewer: (state) => state.role === 'viewer',
    roleDisplayName: (state) => {
      const names = { viewer: '普通用户', editor: '编辑用户', admin: '管理员', super_admin: '超级管理员' }
      return names[state.role] || '未登录'
    }
  },

  actions: {
    setToken(token) {
      this.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    setUserInfo(userInfo) {
      this.userInfo = userInfo
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      if (userInfo?.role) {
        this.setRole(userInfo.role)
      }
    },

    setMenus(menus) {
      this.menus = menus
      localStorage.setItem('menus', JSON.stringify(menus))
    },

    setPermissions(permissions) {
      this.permissions = permissions
      localStorage.setItem('permissions', JSON.stringify(permissions))
    },

    setRole(role) {
      this.role = role
      localStorage.setItem('role', role)
    },

    clearUserInfo() {
      this.token = ''
      this.userInfo = null
      this.permissions = []
      this.menus = []
      this.role = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('permissions')
      localStorage.removeItem('menus')
      localStorage.removeItem('role')
    },

    login(token, userInfo) {
      this.setToken(token)
      this.setUserInfo(userInfo)
    },

    logout() {
      this.clearUserInfo()
    },

    hasPermission(permission) {
      if (!this.role) return false
      if (this.role === 'admin' || this.role === 'super_admin') return true
      return this.permissions.includes(permission)
    },

    hasAllPermissions(permissions) {
      if (!this.role) return false
      if (this.role === 'admin' || this.role === 'super_admin') return true
      return permissions.every(p => this.permissions.includes(p))
    },

    hasAnyPermission(permissions) {
      if (!this.role) return false
      if (this.role === 'admin' || this.role === 'super_admin') return true
      return permissions.some(p => this.permissions.includes(p))
    }
  }
})
