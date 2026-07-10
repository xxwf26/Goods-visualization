/**
 * 周边价格登记 API 服务
 */
import request from './request'

/**
 * 获取价格记录列表
 */
export function getPriceRecords(params) {
  return request.get('/price-records', { params })
}

/**
 * 价格查询聚合（服务端全量统计 + 跨供应商对比 + 明细）
 */
export function queryPriceRecords(params) {
  return request.get('/price-records/query', { params })
}

/**
 * 价格记录筛选选项（去重下拉）
 */
export function getPriceRecordOptions() {
  return request.get('/price-records/options')
}

/**
 * 报价审核参考（场景5）：同品类历史区间 + 报价裁定 + 相近数量 + 同/跨供应商对比
 */
export function quoteReviewPrice(params) {
  return request.get('/price-records/quote-review', { params })
}

/**
 * 获取价格记录详情
 */
export function getPriceRecordDetail(id) {
  return request.get(`/price-records/${id}`)
}

/**
 * 新增价格记录
 */
export function createPriceRecord(data) {
  return request.post('/price-records', data)
}

/**
 * 更新价格记录
 */
export function updatePriceRecord(id, data) {
  return request.put(`/price-records/${id}`, data)
}

/**
 * 删除价格记录
 */
export function deletePriceRecord(id) {
  return request.delete(`/price-records/${id}`)
}

/**
 * 批量删除价格记录
 * @param {number[]} ids
 */
export function batchDeletePriceRecords(ids) {
  return request.delete('/price-records/batch', { data: { ids } })
}

// 回收站
export function getPriceRecordTrash(params) { return request.get('/price-records/trash', { params }) }
export function restorePriceRecord(id) { return request.put(`/price-records/${id}/restore`) }
export function purgePriceRecord(id) { return request.delete(`/price-records/${id}/purge`) }

export default {
  getPriceRecords,
  queryPriceRecords,
  getPriceRecordDetail,
  createPriceRecord,
  updatePriceRecord,
  deletePriceRecord,
  batchDeletePriceRecords,
  getPriceRecordTrash,
  restorePriceRecord,
  purgePriceRecord
}