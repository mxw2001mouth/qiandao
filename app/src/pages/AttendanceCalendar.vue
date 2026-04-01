<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import dayjs from 'dayjs'
import type { Attendance } from '../types'
import { getAttendanceByDateRange, getDailyStats } from '../db/repositories/attendanceRepository'
import { getStudentById } from '../db/repositories/studentRepository'
import AppCard from '../components/ui/AppCard.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppModal from '../components/ui/AppModal.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'

type ViewMode = 'week' | 'month'

const viewMode = ref<ViewMode>('week')
const currentDate = ref(dayjs())
const loading = ref(false)

// 日期范围内的签到数据，按日期分组
const attendanceMap = ref<Map<string, Attendance[]>>(new Map())

// 日期详情弹窗
const showDetailModal = ref(false)
const selectedDate = ref('')
const selectedDateRecords = ref<{ name: string; status: string }[]>([])
const selectedDateStats = ref({ total: 0, present: 0, late: 0, leave: 0 })
const detailLoading = ref(false)

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 当前视图的日期范围
const dateRange = computed(() => {
  if (viewMode.value === 'week') {
    // dayjs 默认周日=0，周一=1，计算本周一：若今天是周日(0)则往前6天，否则往前 (day-1) 天
    const day = currentDate.value.day() // 0=周日
    const daysToMonday = day === 0 ? 6 : day - 1
    const start = currentDate.value.subtract(daysToMonday, 'day')
    const end = start.add(6, 'day')
    return { start, end }
  } else {
    const start = currentDate.value.startOf('month')
    const end = currentDate.value.endOf('month')
    return { start, end }
  }
})

// 标题显示
const headerTitle = computed(() => {
  if (viewMode.value === 'week') {
    const { start, end } = dateRange.value
    return `${start.format('M月D日')} - ${end.format('M月D日')}`
  }
  return currentDate.value.format('YYYY年M月')
})

// 月视图的日历网格（含前后补位）
const calendarDays = computed(() => {
  if (viewMode.value === 'week') {
    const { start } = dateRange.value
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'))
  }

  const monthStart = currentDate.value.startOf('month')
  const monthEnd = currentDate.value.endOf('month')
  // 周一开始，计算前补位天数（dayjs day(): 0=周日）
  let startDay = monthStart.day() - 1
  if (startDay < 0) startDay = 6
  const gridStart = monthStart.subtract(startDay, 'day')

  const totalDays = startDay + monthEnd.date()
  const rows = Math.ceil(totalDays / 7)
  return Array.from({ length: rows * 7 }, (_, i) => gridStart.add(i, 'day'))
})

// 判断是否当前月
function isCurrentMonth(date: dayjs.Dayjs): boolean {
  return date.month() === currentDate.value.month()
}

// 判断是否今天
function isToday(date: dayjs.Dayjs): boolean {
  return date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
}

// 获取某天的出勤人数
function getDayCount(date: dayjs.Dayjs): number {
  const key = date.format('YYYY-MM-DD')
  return attendanceMap.value.get(key)?.length || 0
}

// 获取某天的出勤率颜色
function getDayColor(date: dayjs.Dayjs): string {
  const count = getDayCount(date)
  if (count === 0) return ''
  const records = attendanceMap.value.get(date.format('YYYY-MM-DD')) || []
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length
  const rate = presentCount / records.length
  if (rate >= 0.9) return 'bg-green-100 text-green-700'
  if (rate >= 0.7) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

// 导航
function navigatePrev() {
  if (viewMode.value === 'week') {
    currentDate.value = currentDate.value.subtract(1, 'week')
  } else {
    currentDate.value = currentDate.value.subtract(1, 'month')
  }
}

function navigateNext() {
  if (viewMode.value === 'week') {
    currentDate.value = currentDate.value.add(1, 'week')
  } else {
    currentDate.value = currentDate.value.add(1, 'month')
  }
}

function goToToday() {
  currentDate.value = dayjs()
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const { start, end } = dateRange.value
    // 月视图多加载前后补位的数据
    const queryStart = viewMode.value === 'month'
      ? start.startOf('month').subtract(7, 'day').format('YYYY-MM-DD')
      : start.format('YYYY-MM-DD')
    const queryEnd = viewMode.value === 'month'
      ? end.endOf('month').add(7, 'day').format('YYYY-MM-DD')
      : end.format('YYYY-MM-DD')

    const records = await getAttendanceByDateRange(queryStart, queryEnd)
    const map = new Map<string, Attendance[]>()
    for (const r of records) {
      if (!map.has(r.date)) map.set(r.date, [])
      map.get(r.date)!.push(r)
    }
    attendanceMap.value = map
  } catch {
    attendanceMap.value = new Map()
  } finally {
    loading.value = false
  }
}

// 点击日期显示详情
async function onDayClick(date: dayjs.Dayjs) {
  const dateStr = date.format('YYYY-MM-DD')
  if (getDayCount(date) === 0) return

  selectedDate.value = date.format('M月D日 dddd')
  showDetailModal.value = true
  detailLoading.value = true

  try {
    selectedDateStats.value = await getDailyStats(dateStr)
    const records = attendanceMap.value.get(dateStr) || []
    const enriched: { name: string; status: string }[] = []
    for (const r of records) {
      const student = await getStudentById(r.student_id)
      enriched.push({
        name: student?.name || `学生${r.student_id}`,
        status: r.status,
      })
    }
    selectedDateRecords.value = enriched
  } catch {
    selectedDateRecords.value = []
  } finally {
    detailLoading.value = false
  }
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  present: { label: '到课', variant: 'success' },
  late: { label: '迟到', variant: 'warning' },
  leave: { label: '请假', variant: 'info' },
  absent: { label: '请假', variant: 'info' },
}

onMounted(loadData)
watch([viewMode, currentDate], loadData)
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 视图切换 -->
    <div class="flex bg-slate-100 rounded-xl p-1">
      <button
        :class="[
          'flex-1 h-11 text-sm font-medium rounded-xl transition-all duration-200',
          viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500',
        ]"
        @click="viewMode = 'week'"
      >
        周视图
      </button>
      <button
        :class="[
          'flex-1 h-11 text-sm font-medium rounded-xl transition-all duration-200',
          viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500',
        ]"
        @click="viewMode = 'month'"
      >
        月视图
      </button>
    </div>

    <!-- 日期导航 -->
    <div class="flex items-center justify-between">
      <button
        class="w-11 h-11 flex items-center justify-center rounded-xl active:bg-slate-100"
        aria-label="上一周期"
        @click="navigatePrev"
      >
        <ChevronLeft class="w-5 h-5 text-slate-600" />
      </button>
      <button class="text-sm font-bold text-slate-800" @click="goToToday">
        {{ headerTitle }}
      </button>
      <button
        class="w-11 h-11 flex items-center justify-center rounded-xl active:bg-slate-100"
        aria-label="下一周期"
        @click="navigateNext"
      >
        <ChevronRight class="w-5 h-5 text-slate-600" />
      </button>
    </div>

    <!-- 日历网格 -->
    <AppCard class="!p-3">
      <!-- 星期标题行 -->
      <div class="grid grid-cols-7 mb-2">
        <div v-for="d in weekDays" :key="d" class="text-center text-xs text-slate-400 font-medium py-1">
          {{ d }}
        </div>
      </div>

      <!-- 日期格子 -->
      <div v-if="loading" class="flex justify-center py-10">
        <LoadingSpinner />
      </div>
      <div v-else class="grid grid-cols-7 gap-1">
        <button
          v-for="(day, i) in calendarDays"
          :key="i"
          :class="[
            'flex flex-col items-center justify-center rounded-xl py-1.5 min-h-[52px] transition-all',
            viewMode === 'month' && !isCurrentMonth(day) ? 'opacity-30' : '',
            isToday(day) ? 'ring-2 ring-indigo-400' : '',
            getDayCount(day) > 0 ? 'cursor-pointer active:scale-95' : 'cursor-default',
          ]"
          @click="onDayClick(day)"
        >
          <span class="text-xs text-slate-600">{{ day.date() }}</span>
          <span
            v-if="getDayCount(day) > 0"
            :class="[
              'text-xs font-bold mt-0.5 w-6 h-6 rounded-full flex items-center justify-center',
              getDayColor(day),
            ]"
          >
            {{ getDayCount(day) }}
          </span>
        </button>
      </div>
    </AppCard>

    <!-- 日期详情弹窗 -->
    <AppModal v-model:visible="showDetailModal" :title="selectedDate">
      <div v-if="detailLoading" class="flex justify-center py-6">
        <LoadingSpinner />
      </div>
      <div v-else>
        <!-- 统计概览 -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="text-center">
            <div class="text-lg font-bold text-green-600">{{ selectedDateStats.present }}</div>
            <div class="text-xs text-slate-400">到课</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-yellow-500">{{ selectedDateStats.late }}</div>
            <div class="text-xs text-slate-400">迟到</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-indigo-500">{{ selectedDateStats.leave }}</div>
            <div class="text-xs text-slate-400">请假</div>
          </div>
        </div>

        <!-- 学生列表 -->
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="(record, idx) in selectedDateRecords"
            :key="idx"
            class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
          >
            <span class="text-sm text-slate-700">{{ record.name }}</span>
            <AppBadge
              :label="statusMap[record.status]?.label || record.status"
              :variant="statusMap[record.status]?.variant || 'info'"
            />
          </div>
        </div>
      </div>
    </AppModal>
  </div>
</template>
