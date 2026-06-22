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

export default {
  getPriceRecords,
  queryPriceRecords,
  getPriceRecordDetail,
  createPriceRecord,
  updatePriceRecord,
  deletePriceRecord
}