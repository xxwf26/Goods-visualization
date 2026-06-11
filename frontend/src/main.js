import '@/assets/theme.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import request from './utils/request'
import { registerPermissionDirective } from '@/directives/permission'
import { registerAllDirectives } from '@/directives/permission-extra'

const app = createApp(App)
const pinia = createPinia()

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册权限指令
registerPermissionDirective(app)
registerAllDirectives(app)

app.config.globalProperties.$http = request

// 重要：Pinia 必须在路由之前初始化
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
