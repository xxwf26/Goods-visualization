/**
 * 项目 API 服务
 */
import request from './request'

/**
 * 获取项目列表
 * @param {Object} params - 查询参数
 */
export function getProjects(params) {
  return request.get('/projects', { params })
}

/**
 * 获取项目详情
 * @param {number} id - 项目ID
 */
export function getProjectDetail(id) {
  return request.get(`/projects/${id}`)
}

/**
 * 新增项目
 * @param {Object} data - 项目数据
 */
export function createProject(data) {
  return request.post('/projects', data)
}

/**
 * 更新项目
 * @param {number} id - 项目ID
 * @param {Object} data - 项目数据
 */
export function updateProject(id, data) {
  return request.put(`/projects/${id}`, data)
}

/**
 * 删除项目
 * @param {number} id - 项目ID
 */
export function deleteProject(id) {
  return request.delete(`/projects/${id}`)
}

/**
 * 导出项目
 * @param {Object} params - 导出参数
 */
export function exportProjects(params) {
  return request.get('/projects/export', { params })
}

/**
 * 项目筛选选项（去重下拉）
 */
export function getProjectOptions() {
  return request.get('/projects/options')
}

export default {
  getProjects,
  getProjectDetail,
  createProject,
  updateProject,
  deleteProject,
  exportProjects,
  getProjectOptions
}
