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

/** 发起关键词采集 { keywords:[], limit }，返回 { run_id } */
export function startCrawl(data) {
  return request.post('/candidates/crawl', data)
}

/** 采集批次状态 */
export function getCrawlStatus(runId) {
  return request.get(`/candidates/crawl/${runId}`)
}

/** 采集批次列表 */
export function getCrawlRuns() {
  return request.get('/candidates/crawl-runs')
}

/** 小红书 cookie 是否已配置 { configured } */
export function getXhsCookieStatus() {
  return request.get('/candidates/xhs-cookie-status')
}

/** 小红书扫码登录（阻塞，服务端弹出浏览器，最长约130秒） */
export function xhsLogin() {
  return request.post('/candidates/xhs-login', {}, { timeout: 180000 })
}

export default {
  getCandidates,
  getCandidateCounts,
  getCandidateDetail,
  createCandidate,
  adoptCandidate,
  rejectCandidate,
  restoreCandidate,
  startCrawl,
  getCrawlStatus,
  getCrawlRuns,
  getXhsCookieStatus,
  xhsLogin
}
