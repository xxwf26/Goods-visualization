/**
 * 全局检索 API（跨模块即时搜索）
 */
import request from './request'

export function searchAll(q) {
  return request.get('/search', { params: { q } })
}

export default { searchAll }
