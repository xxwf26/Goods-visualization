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
 * 回收站列表（已软删的灵感）
 */
export function getInspirationTrash(params) {
  return request.get('/inspirations/trash', { params })
}

/**
 * 从回收站恢复
 * @param {number} id - 灵感ID
 */
export function restoreInspiration(id) {
  return request.put(`/inspirations/${id}/restore`)
}

/**
 * 彻底删除（物理删除，仅限回收站中的记录）
 * @param {number} id - 灵感ID
 */
export function purgeInspiration(id) {
  return request.delete(`/inspirations/${id}/purge`)
}

/**
 * 检测单条灵感链接是否失效
 * @param {number} id - 灵感ID
 */
export function checkInspirationLink(id) {
  return request.post(`/inspirations/${id}/check-link`)
}

/**
 * 手动设置链接状态
 * @param {number} id - 灵感ID
 * @param {string} status - ok|dead|error|unknown
 */
export function setLinkStatus(id, status) {
  return request.put(`/inspirations/${id}/link-status`, { status })
}

/**
 * 更新灵感链接
 * @param {number} id - 灵感ID
 * @param {string} link - 新链接URL
 */
export function updateInspirationLink(id, link) {
  return request.put(`/inspirations/${id}/link`, { link })
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
  return request.post(`/inspirations/${id}/analyze`, {}, { timeout: 300000 })
}

/**
 * 重新抓取内容快照（从链接重新拉取完整正文）
 * @param {number} id - 灵感ID
 */
export function refreshInspirationSnapshot(id) {
  return request.post(`/inspirations/${id}/refresh-snapshot`)
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
  checkInspirationLink,
  checkInspirationLinks,
  analyzeInspirationImages,
  refreshInspirationSnapshot,
  updateInspirationDetail
}
