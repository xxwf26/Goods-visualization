/**
 * 粘贴图片上传 composable
 * 监听 paste 事件，从剪贴板提取图片文件，回调上传。
 * 用法：在组件 setup 中调用 usePasteUpload(files => uploadFn(files))
 * 仅在弹窗挂载期间监听，卸载自动清理。
 */
import { onMounted, onBeforeUnmount } from 'vue'

export function usePasteUpload(onImages) {
  function handler(e) {
    const items = e.clipboardData?.items
    if (!items) return
    const files = []
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length) {
      e.preventDefault()
      onImages(files)
    }
  }
  onMounted(() => window.addEventListener('paste', handler))
  onBeforeUnmount(() => window.removeEventListener('paste', handler))
}
