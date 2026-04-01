<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import AttendanceStats from './stats/AttendanceStats.vue'
import BusinessStats from './stats/BusinessStats.vue'

const auth = useAuthStore()

type TabKey = 'attendance' | 'business'
const activeTab = ref<TabKey>('attendance')

// 月份选择器
const currentMonth = ref(dayjs())

function prevMonth() {
  currentMonth.value = currentMonth.value.subtract(1, 'month')
}

function nextMonth() {
  if (currentMonth.value.isSame(dayjs(), 'month')) return
  currentMonth.value = currentMonth.value.add(1, 'month')
}

const isCurrentMonth = () => currentMonth.value.isSame(dayjs(), 'month')
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-24">
    <AppHeader title="统计分析" />

    <div class="px-4 pt-3">
      <!-- Tab 切换 -->
      <div class="flex bg-white rounded-xl p-1 shadow-sm">
        <button
          class="flex-1 h-11 text-sm font-medium rounded-xl transition-colors"
          :class="activeTab === 'attendance'
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'attendance'"
        >
          出勤统计
        </button>
        <button
          v-if="auth.isAdmin"
          class="flex-1 h-11 text-sm font-medium rounded-xl transition-colors"
          :class="activeTab === 'business'
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'business'"
        >
          经营统计
        </button>
      </div>

      <!-- 月份选择器（仅出勤统计时显示） -->
      <div v-if="activeTab === 'attendance'" class="flex items-center justify-center gap-4 mt-3">
        <button
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-white shadow-sm active:bg-slate-50"
          aria-label="查看上个月"
          @click="prevMonth"
        >
          <ChevronLeft class="w-4 h-4 text-slate-600" />
        </button>
        <span class="text-sm font-medium text-slate-700 min-w-[100px] text-center">
          {{ currentMonth.format('YYYY年M月') }}
        </span>
        <button
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-white shadow-sm active:bg-slate-50"
          :class="{ 'opacity-30 pointer-events-none': isCurrentMonth() }"
          aria-label="查看下个月"
          @click="nextMonth"
        >
          <ChevronRight class="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <AttendanceStats
      v-if="activeTab === 'attendance'"
      :year="currentMonth.year()"
      :month="currentMonth.month() + 1"
    />
    <BusinessStats v-else-if="activeTab === 'business'" />
  </div>
  <BottomNav />
</template>
