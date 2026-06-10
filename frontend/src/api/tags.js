/**
 * 标签 API 服务
 */
import request from './request'

/**
 * 获取标签列表
 * @param {Object} params - 查询参数
 * @param {string} params.tag_type - 标签类型: ip, category, craft, scene
 * @param {number} params.status - 状态: 1-正常, 0-禁用
 */
export function getTags(params) {
  return request.get('/tags', { params })
}

/**
 * 获取所有标签（按类型分组）
 */
export function getAllTags() {
  return request.get('/tags')
}

/**
 * 获取指定类型的标签
 * @param {string} type - 标签类型: ip, category, craft, scene
 */
export function getTagsByType(type) {
  return request.get('/tags', { params: { tag_type: type } })
}

/**
 * 获取标签详情
 * @param {number} id - 标签ID
 */
export function getTagDetail(id) {
  return request.get(`/tags/${id}`)
}

/**
 * 新增标签
 * @param {Object} data - 标签数据
 */
export function createTag(data) {
  return request.post('/tags', data)
}

/**
 * 更新标签
 * @param {number} id - 标签ID
 * @param {Object} data - 标签数据
 */
export function updateTag(id, data) {
  return request.put(`/tags/${id}`, data)
}

/**
 * 删除标签
 * @param {number} id - 标签ID
 */
export function deleteTag(id) {
  return request.delete(`/tags/${id}`)
}

export default {
  getTags,
  getAllTags,
  getTagsByType,
  getTagDetail,
  createTag,
  updateTag,
  deleteTag
}
