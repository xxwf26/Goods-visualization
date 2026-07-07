import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 构建期注入 CSP（Content-Security-Policy）meta，dev 不受影响
function cspPlugin() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",            // 阻断内联脚本注入（构建产物无内联脚本）
    "style-src 'self' 'unsafe-inline'", // Vue/Element 运行时注入样式需要
    "img-src 'self' data: blob: https: http:", // 小红书等远程图片 + base64/预览
    "connect-src 'self'",           // 前端仅调用同源 /api
    "font-src 'self' data:",
    "media-src 'self' data:",
    "object-src 'none'",            // 禁用 flash/object/embed
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  return {
    name: 'inject-csp',
    apply: 'build', // 仅构建时注入，dev server 不影响
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`)
    }
  }
}

export default defineConfig({
  plugins: [vue(), cspPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
