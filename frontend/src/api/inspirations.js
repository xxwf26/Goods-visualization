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

/**
 * 检测单条灵感链接是否失效
 * @param {number} id - 灵感ID
 */
export function checkInspirationLink(id) {
  return request.post(`/inspirations/${id}/check-link`)
}

/**
 * 批量检测灵感链接失效
 * @param {Object} data - { inspiration_type? } 可选按类型限定
 */
export function checkInspirationLinks(data = {}) {
  return request.post('/inspirations/check-links', data)
}

/**
 * AI 分析帖子图片内容（OCR图片 + 总结）
 * @param {number} id - 灵感ID
 */
export function analyzeInspirationImages(id) {
  return request.post(`/inspirations/${id}/analyze`)
}

/**
 * 编辑灵感详情（就地修改图文）
 * @param {number} id - 灵感ID
 * @param {Object} data - { title?, author?, description?, content_summary?, image_texts? }
 */
export function updateInspirationDetail(id, data) {
  return request.put(`/inspirations/${id}/detail`, data)
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
  createFolder,
  checkInspirationLink,
  checkInspirationLinks,
  analyzeInspirationImages,
  updateInspirationDetail
}
