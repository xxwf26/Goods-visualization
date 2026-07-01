/**
 * 价格 API 服务
 * 注意：queryPrice / getPriceStats 已废弃，价格查询改用 priceRecords.js
 * 本文件仅保留 getCategoryDetail（品类详情页用）
 */
import request from './request'

/**
 * 品类详情页数据
 * @param {number} id - 品类标签ID
 * @param {Object} params - 查询参数
 */
export function getCategoryDetail(id, params) {
  return request.get(`/price/category/${id}`, { params })
}

export default { getCategoryDetail }
