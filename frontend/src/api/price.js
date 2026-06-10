/**
 * 价格查询 API 服务
 */
import request from './request'

/**
 * 价格查询
 * @param {Object} params - 查询参数
 * @param {string} params.category_tag_ids - 品类标签ID（逗号分隔）
 * @param {string} params.craft_tag_ids - 工艺标签ID（逗号分隔）
 * @param {number} params.quantity - 目标数量
 * @param {number} params.quantity_tolerance - 数量容差比例（默认0.3）
 * @param {number} params.supplier_id - 供应商ID
 * @param {string} params.start_date - 开始日期
 * @param {string} params.end_date - 结束日期
 */
export function queryPrice(params) {
  return request.get('/price/query', { params })
}

/**
 * 价格统计概览
 * @param {Object} params - 查询参数
 * @param {number} params.top - 返回数量
 */
export function getPriceStats(params) {
  return request.get('/price/stats', { params })
}

/**
 * 品类详情页数据
 * @param {number} id - 品类标签ID
 * @param {Object} params - 查询参数
 * @param {number} params.top - 返回数量
 */
export function getCategoryDetail(id, params) {
  return request.get(`/price/category/${id}`, { params })
}

export default {
  queryPrice,
  getPriceStats,
  getCategoryDetail
}
