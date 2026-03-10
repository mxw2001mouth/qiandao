<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { useStatsStore } from '../../stores/stats'
import { createLineOption, createBarOption, CHART_COLORS } from '../../utils/chartOptions'
import AppCard from '../../components/ui/AppCard.vue'
import AppAvatar from '../../components/ui/AppAvatar.vue'

const props = defineProps<{
  year: number
  month: number
}>()

const statsStore = useStatsStore()

// ECharts 动态导入（减小首屏 chunk）
const echartsModule = shallowRef<typeof import('echarts') | null>(null)

// ECharts refs
const trendChartRef = ref<HTMLElement>()
const distributionChartRef = ref<HTMLElement>()
let trendChart: ReturnType<typeof import('echarts')['init']> | null = null
let distributionChart: ReturnType<typeof import('echarts')['init']> | null = null

function renderTrendChart() {
  if (!trendChartRef.value || !echartsModule.value) return
  if (!trendChart) {
    trendChart = echartsModule.value.init(trendChartRef.value)
  }
  const option = createLineOption(
    '',
    statsStore.monthlyDays,
    statsStore.monthlyAttendanceRates,
    { smooth: true, areaStyle: true, yAxisUnit: '%' }
  )
  trendChart.setOption(option, true)
}

function renderDistributionChart() {
  if (!distributionChartRef.value || !echartsModule.value) return
  if (!distributionChart) {
    distributionChart = echartsModule.value.init(distributionChartRef.value)
  }
  const dist = statsStore.statusDistribution
  const option = createBarOption(
    '',
    ['到课', '迟到', '请假', '旷课'],
    [dist.present, dist.late, dist.leave, dist.absent],
    { horizontal: true, colorList: CHART_COLORS }
  )
  distributionChart.setOption(option, true)
}

async function loadData() {
  await statsStore.loadAttendanceStats(props.year, props.month)
  renderTrendChart()
  renderDistributionChart()
}

// 窗口 resize 处理
function handleResize() {
  trendChart?.resize()
  distributionChart?.resize()
}

onMounted(async () => {
  echartsModule.value = await import('echarts')
  await loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  distributionChart?.dispose()
  trendChart = null
  distributionChart = null
  window.removeEventListener('resize', handleResize)
})

watch(() => [props.year, props.month], () => {
  loadData()
})

function getRateColor(rate: number): string {
  if (rate >= 90) return 'bg-green-500'
  if (rate >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="px-4 pt-4 space-y-4">
    <!-- 月出勤趋势折线图 -->
    <AppCard>
      <h3 class="text-sm font-semibold text-slate-700 mb-2">月出勤趋势</h3>
      <div ref="trendChartRef" class="w-full h-56"></div>
    </AppCard>

    <!-- 状态分布横向柱状图 -->
    <AppCard>
      <h3 class="text-sm font-semibold text-slate-700 mb-2">出勤状态分布</h3>
      <div ref="distributionChartRef" class="w-full h-48"></div>
    </AppCard>

    <!-- 学生出勤排行 -->
    <AppCard>
      <h3 class="text-sm font-semibold text-slate-700 mb-3">学生出勤排行</h3>
      <div v-if="statsStore.studentRanking.length === 0" class="text-sm text-slate-400 text-center py-6">
        暂无签到数据
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="(item, index) in statsStore.studentRanking"
          :key="item.student.id"
          class="flex items-center gap-3"
        >
          <!-- 排名 -->
          <span
            class="w-6 text-center text-xs font-bold shrink-0"
            :class="index < 3 ? 'text-indigo-500' : 'text-slate-400'"
          >
            {{ index + 1 }}
          </span>

          <AppAvatar :name="item.student.name" size="sm" />

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-slate-700 truncate">{{ item.student.name }}</span>
              <span class="text-sm font-bold text-slate-800">{{ item.attendanceRate }}%</span>
            </div>
            <!-- 进度条 -->
            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="getRateColor(item.attendanceRate)"
                :style="{ width: `${item.attendanceRate}%` }"
              />
            </div>
            <div class="flex gap-3 mt-1 text-[11px] text-slate-400">
              <span>迟到 {{ item.lateCount }}</span>
              <span>请假 {{ item.leaveCount }}</span>
              <span>旷课 {{ item.absentCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
