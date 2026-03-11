import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { database } from './db/database'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

async function bootstrap() {
  try {
    await database.init()
  } catch (e) {
    console.error('数据库初始化失败:', e)
    // DB 初始化失败时仍然挂载，避免白屏；后续 DB 操作会有各自的错误提示
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
