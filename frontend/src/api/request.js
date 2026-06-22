/**
 * API 基础配置
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response
      switch (status) {
        case 401:
          // 登录接口的 401 是正常错误（账号密码错误），不拦截
          if (config.url?.includes('/auth/login')) {
            ElMessage.error(data?.message || '用户名或密码错误')
            return Promise.reject(error)
          }
          ElMessage.error('登录已过期，请重新登录')
          // 清理全部登录态，避免残留导致界面误判已登录
          ;['token', 'userInfo', 'permissions', 'menus', 'role'].forEach(k => localStorage.removeItem(k))
          // 携带当前路径，登录后可跳回
          if (!location.pathname.startsWith('/login')) {
            const redirect = encodeURIComponent(location.pathname + location.search)
            window.location.href = `/login?redirect=${redirect}`
          }
          break
        case 403:
          ElMessage.error(data?.message || '没有权限访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error(data?.message || '服务器错误')
          break
        default:
          ElMessage.error(data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default request
