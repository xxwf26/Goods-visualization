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

/**
 * 回撤一条操作（逆操作还原）
 */
export function undoLog(id) {
  return request.post(`/logs/${id}/undo`)
}

export default { getLogs, getLogModules, undoLog }
