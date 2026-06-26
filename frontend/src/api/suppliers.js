/**
 * 供应商 API 服务
 */
import request from './request'

/**
 * 获取供应商列表
 * @param {Object} params - 查询参数
 */
export function getSuppliers(params) {
  return request.get('/suppliers', { params })
}

/**
 * 获取供应商详情
 * @param {number} id - 供应商ID
 */
export function getSupplierDetail(id) {
  return request.get(`/suppliers/${id}`)
}

/**
 * 新增供应商
 * @param {Object} data - 供应商数据
 */
export function createSupplier(data) {
  return request.post('/suppliers', data)
}

/**
 * 更新供应商
 * @param {number} id - 供应商ID
 * @param {Object} data - 供应商数据
 */
export function updateSupplier(id, data) {
  return request.put(`/suppliers/${id}`, data)
}

/**
 * 删除供应商
 * @param {number} id - 供应商ID
 */
export function deleteSupplier(id) {
  return request.delete(`/suppliers/${id}`)
}

/**
 * 供应商表现评分看板聚合数据
 */
export function getSupplierDashboard() {
  return request.get('/suppliers/dashboard')
}

export default {
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierDashboard
}
