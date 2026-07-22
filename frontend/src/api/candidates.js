/**
 * 灵感采集候选 API 服务
 */
import request from './request'

/** 候选列表 */
export function getCandidates(params) {
  return request.get('/candidates', { params })
}

/** 各状态计数 { pending, adopted, rejected } */
export function getCandidateCounts() {
  return request.get('/candidates/counts')
}

/** 候选详情 */
export function getCandidateDetail(id) {
  return request.get(`/candidates/${id}`)
}

/** 手动新增候选（贴链接入队） */
export function createCandidate(data) {
  return request.post('/candidates', data)
}

/** 转正：候选 → 灵感库。data 可含 title/inspiration_type/categories/各标签id 覆盖 */
export function adoptCandidate(id, data = {}) {
  return request.post(`/candidates/${id}/adopt`, data)
}

/** 丢弃候选 */
export function rejectCandidate(id) {
  return request.post(`/candidates/${id}/reject`)
}

/** 恢复候选（rejected → pending） */
export function restoreCandidate(id) {
  return request.post(`/candidates/${id}/restore`)
}

export default {
  getCandidates,
  getCandidateCounts,
  getCandidateDetail,
  createCandidate,
  adoptCandidate,
  rejectCandidate,
  restoreCandidate
}
