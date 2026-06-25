/**
 * 操作日志 API（审计，仅管理员）
 */
import request from './request'

export function getLogs(params) {
  return request.get('/logs', { params })
}

export function getLogModules() {
  return request.get('/logs/modules')
}

export default { getLogs, getLogModules }
