<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { updateAllLifecycleTags } from './utils/lifecycle'
import AppHeader from './components/layout/AppHeader.vue'
import BottomNav from './components/layout/BottomNav.vue'

const route = useRoute()
const router = useRouter()
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

type HistoryNavState = {
  back?: string | null
  current?: string
  forward?: string | null
  position?: number
  replaced?: boolean
  scroll?: unknown
}

const touchStartX = ref(0)
const touchStartY = ref(0)
const touchStartTime = ref(0)
const touchStartEdge = ref<'left' | 'right' | 'none'>('none')

const EDGE_TRIGGER_PX = 28
const SWIPE_MIN_X = 72
const SWIPE_MAX_Y = 64
const SWIPE_MAX_DURATION = 550

function getHistoryNavState(): HistoryNavState {
  return (window.history.state || {}) as HistoryNavState
}

function canSwipeBack(): boolean {
  const state = getHistoryNavState()
  return !!state.back
}

function canSwipeForward(): boolean {
  const state = getHistoryNavState()
  return !!state.forward
}

function isSwipeBlockedTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return !!el.closest('input, textarea, select, button, a, [data-no-swipe]')
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  if (isSwipeBlockedTarget(e.target)) return

  const t = e.touches[0]
  if (!t) return
  touchStartX.value = t.clientX
  touchStartY.value = t.clientY
  touchStartTime.value = Date.now()

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth
  if (t.clientX <= EDGE_TRIGGER_PX) {
    touchStartEdge.value = 'left'
  } else if (t.clientX >= viewportWidth - EDGE_TRIGGER_PX) {
    touchStartEdge.value = 'right'
  } else {
    touchStartEdge.value = 'none'
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.changedTouches.length !== 1) return
  const t = e.changedTouches[0]
  if (!t) return

  const dx = t.clientX - touchStartX.value
  const dy = t.clientY - touchStartY.value
  const duration = Date.now() - touchStartTime.value
  const edge = touchStartEdge.value

  if (duration > SWIPE_MAX_DURATION) return
  if (Math.abs(dy) > SWIPE_MAX_Y) return
  if (Math.abs(dx) < SWIPE_MIN_X) return
  if (Math.abs(dx) < Math.abs(dy) * 1.3) return

  // 右滑：返回（仅左边缘触发），首页/首段历史自动拦截
  if (dx > 0 && edge === 'left') {
    if (canSwipeBack()) router.back()
    return
  }
  // 左滑：前进（仅右边缘触发），末尾历史自动拦截
  if (dx < 0 && edge === 'right') {
    if (canSwipeForward()) router.go(1)
  }
}

function onTouchCancel() {
  touchStartX.value = 0
  touchStartY.value = 0
  touchStartTime.value = 0
  touchStartEdge.value = 'none'
}

onMounted(() => {
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchCancel, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchCancel)
})
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
