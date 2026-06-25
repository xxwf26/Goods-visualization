/**
 * 防抖工具：连续触发时只在停止 delay 毫秒后执行最后一次
 * 返回的函数带 .cancel() 用于取消挂起的调用
 */
export function debounce(fn, delay = 300) {
  let timer = null
  const wrapped = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return wrapped
}

export default debounce
