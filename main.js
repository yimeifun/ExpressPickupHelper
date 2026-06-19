import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App'

// Vue 3 入口：注册 Pinia 全局状态管理
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return {
    app,
    pinia
  }
}
