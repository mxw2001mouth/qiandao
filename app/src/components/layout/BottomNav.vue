<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarCheck,
  Users,
  BookOpen,
  BarChart2,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: '签到', icon: CalendarCheck, path: '/attendance/today' },
  { name: '学生', icon: Users, path: '/students' },
  { name: '课时', icon: BookOpen, path: '/followup' },
  { name: '统计', icon: BarChart2, path: '/stats/attendance' },
  { name: '设置', icon: Settings, path: '/settings' },
]

// 根据当前路由判断激活的 tab
const activeIndex = computed(() => {
  const path = route.path
  if (path.startsWith('/attendance')) return 0
  if (path.startsWith('/students')) return 1
  if (path.startsWith('/followup') || path.startsWith('/students') && path.includes('purchase')) return 2
  if (path.startsWith('/stats')) return 3
  if (path.startsWith('/settings') || path.startsWith('/data')) return 4
  return 0
})

function navigateTo(index: number) {
  router.push(tabs[index]!.path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
       :style="{ paddingBottom: 'var(--safe-bottom)' }">
    <div class="flex items-center justify-around h-16">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.name"
        class="flex flex-col items-center justify-center w-full h-full relative transition-colors duration-200"
        @click="navigateTo(index)"
      >
        <component
          :is="tab.icon"
          :class="[
            'w-5 h-5 transition-colors duration-200',
            activeIndex === index ? 'text-indigo-500' : 'text-slate-400',
          ]"
        />
        <span
          :class="[
            'text-[10px] mt-1 font-medium transition-colors duration-200',
            activeIndex === index ? 'text-indigo-500' : 'text-slate-400',
          ]"
        >
          {{ tab.name }}
        </span>
        <!-- 激活指示条 -->
        <div
          v-if="activeIndex === index"
          class="absolute bottom-1 w-4 h-1 bg-indigo-500 rounded-full"
        />
      </button>
    </div>
  </nav>
</template>
