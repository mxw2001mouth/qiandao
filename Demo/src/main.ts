import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { seedDemoData } from './db/seedData'
import './style.css'

// Seed demo data on first load
seedDemoData()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
