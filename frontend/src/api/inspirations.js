/**
 * 灵感库 API 服务
 */
import request from './request'

/**
 * 获取灵感列表
 * @param {Object} params - 查询参数
 */
export function getInspirations(params) {
  return request.get('/inspirations', { params })
}

/**
 * 获取灵感详情
 * @param {number} id - 灵感ID
 */
export function getInspirationDetail(id) {
  return request.get(`/inspirations/${id}`)
}

/**
 * 新增灵感
 * @param {Object} data - 灵感数据
 */
export function createInspiration(data) {
  return request.post('/inspirations', data)
}

/**
 * 更新灵感
 * @param {number} id - 灵感ID
 * @param {Object} data - 灵感数据
 */
export function updateInspiration(id, data) {
  return request.put(`/inspirations/${id}`, data)
}

/**
 * 删除灵感
 * @param {number} id - 灵感ID
 */
export function deleteInspiration(id) {
  return request.delete(`/inspirations/${id}`)
}

/**
 * 收藏灵感
 * @param {number} id - 灵感ID
 * @param {number} folder_id - 收藏夹ID
 */
export function collectInspiration(id, folder_id) {
  return request.post(`/inspirations/${id}/collect`, { folder_id })
}

/**
 * 取消收藏
 * @param {number} id - 灵感ID
 */
export function uncollectInspiration(id) {
  return request.post(`/inspirations/${id}/uncollect`)
}

/**
 * 获取收藏夹列表
 */
export function getFolders() {
  return request.get('/inspiration-folders')
}

/**
 * 新增收藏夹
 * @param {Object} data - 收藏夹数据
 */
export function createFolder(data) {
  return request.post('/inspiration-folders', data)
}

export default {
  getInspirations,
  getInspirationDetail,
  createInspiration,
  updateInspiration,
  deleteInspiration,
  collectInspiration,
  uncollectInspiration,
  getFolders,
  createFolder
}
