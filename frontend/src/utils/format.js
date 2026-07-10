/**
 * 公共格式化工具：日期/日期时间/大数。
 * 统一各页面散落的 formatDate / formatCount 定义，避免重复与漂移。
 * 兼容后端 dateStrings 返回的 "2026-07-09 14:50:09"（空格分隔）及历史 ISO "2026-07-09T06:50:09.000Z"。
 */

/** 取日期部分 YYYY-MM-DD；空值返回 '-' */
export function formatDate(d) {
  if (!d) return '-'
  return String(d).split(/[T ]/)[0]
}

/** 取日期时间 YYYY-MM-DD HH:mm；空值返回 '-' */
export function formatDateTime(d) {
  if (!d) return '-'
  return String(d).replace('T', ' ').substring(0, 16)
}

/** 大数格式化：≥10000 显示 x.x万，否则原样 */
export function formatCount(n) {
  const v = Number(n) || 0
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(v)
}
