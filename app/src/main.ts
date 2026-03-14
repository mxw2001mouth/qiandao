import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { database } from './db/database'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { assertNativeRuntime } from './config/runtimeMode'

dayjs.locale('zh-cn')

function renderStartupError(message: string): void {
  const el = document.getElementById('app')
  if (!el) return

  el.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <h2 style="margin:0 0 10px;color:#0f172a;font-size:18px;">运行环境不匹配</h2>
        <p style="margin:0;color:#334155;line-height:1.7;">${message}</p>
      </div>
    </div>
  `
}

async function bootstrap() {
  try {
    assertNativeRuntime()
    await database.init()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('bootstrap failed:', e)
    renderStartupError(msg)
    return
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
