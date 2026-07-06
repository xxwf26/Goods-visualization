/**
 * 前端 CSV 导出工具
 * 把行数据导出为带 UTF-8 BOM 的 CSV，Excel 打开中文不乱码。
 * 无需后端生成文件，直接从已加载的表格数据生成并触发下载。
 */

/**
 * @param {string} filename 下载文件名（含扩展名）
 * @param {Array<object>} rows 行数据
 * @param {Array<{key:string,label:string}>} columns 列定义（key=字段名，label=表头）
 * @returns {boolean} 是否成功导出
 */
export function exportToCsv(filename, rows, columns) {
  if (!rows || !rows.length || !columns || !columns.length) return false

  // 单元格转义：含逗号/引号/换行的用双引号包裹，内部引号双写
  const escape = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }

  const header = columns.map(c => escape(c.label)).join(',')
  const body = rows
    .map(r => columns.map(c => escape(r[c.key])).join(','))
    .join('\r\n')
  // ﻿ = UTF-8 BOM，确保 Excel 正确识别编码
  const csv = '﻿' + header + '\r\n' + body

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}
