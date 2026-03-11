<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { updateAllLifecycleTags } from './utils/lifecycle'
import AppHeader from './components/layout/AppHeader.vue'
import BottomNav from './components/layout/BottomNav.vue'

const route = useRoute()
const auth = useAuthStore()

// 登录后自动更新所有学生的生命周期标签
watch(() => auth.isLoggedIn, async (loggedIn) => {
  if (loggedIn) {
    try {
      await updateAllLifecycleTags()
    } catch {
      // 数据库可能尚未初始化
    }
  }
}, { immediate: true })

// 页面标题
const pageTitle = computed(() => (route.meta.title as string) || '')

// 需要显示返回按钮的页面
const showBack = computed(() => {
  const backPages = [
    'StudentDetail', 'StudentAdd', 'StudentEdit',
    'PurchaseAdd', 'AttendanceCalendar',
    'StatsAttendance', 'StatsBusiness',
    'DataExport', 'DataBackup',
  ]
  return backPages.includes(route.name as string)
})

// 是否显示底部导航和顶部栏（已登录、非登录页、且页面未自带 chrome）
const showChrome = computed(() => auth.isLoggedIn && route.name !== 'Login' && !route.meta.ownChrome)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <AppHeader
      v-if="showChrome"
      :title="pageTitle"
      :show-back="showBack"
    />

    <main
      class="flex-1 overflow-y-auto"
      :style="showChrome ? { paddingBottom: 'calc(5rem + var(--safe-bottom))' } : {}"
    >
      <RouterView />
    </main>

    <BottomNav v-if="showChrome" />
  </div>
</template>
