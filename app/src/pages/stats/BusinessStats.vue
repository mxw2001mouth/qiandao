<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import { useStatsStore } from '../../stores/stats'
import { createBarOption, createPieOption } from '../../utils/chartOptions'
import AppCard from '../../components/ui/AppCard.vue'
import AppAvatar from '../../components/ui/AppAvatar.vue'
import { AlertTriangle, TrendingUp } from 'lucide-vue-next'

const statsStore = useStatsStore()

// ECharts 动态导入（减小首屏 chunk）
const echartsModule = shallowRef<typeof import('echarts') | null>(null)

const revenueChartRef = ref<HTMLElement>()
const lifecycleChartRef = ref<HTMLElement>()
let revenueChart: ReturnType<typeof import('echarts')['init']> | null = null
let lifecycleChart: ReturnType<typeof import('echarts')['init']> | null = null

function renderRevenueChart() {
  if (!revenueChartRef.value || !echartsModule.value) return
  if (!revenueChart) {
    revenueChart = echartsModule.value.init(revenueChartRef.value)
  }
  const option = createBarOption(
    '',
    statsStore.revenueMonths,
    statsStore.revenueValues,
    { yAxisUnit: '元' }
  )
  revenueChart.setOption(option, true)
}

function renderLifecycleChart() {
  if (!lifecycleChartRef.value || !echartsModule.value) return
  if (!lifecycleChart) {
    lifecycleChart = echartsModule.value.init(lifecycleChartRef.value)
  }
  const totalStudents = statsStore.lifecycleDistribution.reduce((sum, d) => sum + d.value, 0)
  const option = createPieOption(
    '',
    statsStore.lifecycleDistribution,
    { centerText: `${totalStudents}\n总人数` }
  )
  lifecycleChart.setOption(option, true)
}

async function loadData() {
  await statsStore.loadBusinessStats()
  renderRevenueChart()
  renderLifecycleChart()
}

function handleResize() {
  revenueChart?.resize()
  lifecycleChart?.resize()
}

onMounted(async () => {
  echartsModule.value = await import('echarts')
  await loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  revenueChart?.dispose()
  lifecycleChart?.dispose()
  revenueChart = null
  lifecycleChart = null
  window.removeEventListener('resize', handleResize)
})

function getDepletionColor(date: string): string {
  if (date === '已耗尽') return 'text-red-500'
  if (date === '—') return 'text-slate-400'
  return 'text-yellow-600'
}
</script>

<template>
  <div class="px-4 pt-4 space-y-4">
    <!-- 近6月收入柱状图 -->
    <AppCard>
      <h3 class="text-sm font-semibold text-slate-700 mb-2">近6月收入</h3>
      <div ref="revenueChartRef" class="w-full h-56"></div>
    </AppCard>

    <!-- 生命周期分布饼图 -->
    <AppCard>
      <h3 class="text-sm font-semibold text-slate-700 mb-2">学生生命周期分布</h3>
      <div ref="lifecycleChartRef" class="w-full h-64"></div>
    </AppCard>

    <!-- 课时预警列表 -->
    <AppCard>
      <div class="flex items-center gap-2 mb-3">
        <AlertTriangle class="w-4 h-4 text-yellow-500" />
        <h3 class="text-sm font-semibold text-slate-700">课时预警</h3>
      </div>
      <div v-if="statsStore.hourWarnings.length === 0" class="text-sm text-slate-400 text-center py-6">
        暂无预警学生
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="item in statsStore.hourWarnings"
          :key="item.student.id"
          class="flex items-center gap-3"
        >
          <AppAvatar :name="item.student.name" size="sm" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-slate-700 truncate">{{ item.student.name }}</div>
            <div class="text-xs text-slate-400 mt-0.5">
              剩余 {{ item.student.remaining_hours }} 课时 · 周均 {{ item.weeklyAvg }} 次
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-xs font-medium" :class="getDepletionColor(item.depletionDate)">
              {{ item.depletionDate }}
            </div>
            <div class="text-[10px] text-slate-400">预计耗尽</div>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- 续费转化数据 -->
    <AppCard>
      <div class="flex items-center gap-2 mb-4">
        <TrendingUp class="w-4 h-4 text-indigo-500" />
        <h3 class="text-sm font-semibold text-slate-700">续费转化</h3>
      </div>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-green-500">{{ statsStore.renewalConversion.renewed }}</div>
          <div class="text-xs text-slate-500 mt-1">已续费</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-red-500">{{ statsStore.renewalConversion.lost }}</div>
          <div class="text-xs text-slate-500 mt-1">流失</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-indigo-500">{{ statsStore.renewalConversion.rate }}%</div>
          <div class="text-xs text-slate-500 mt-1">转化率</div>
        </div>
      </div>
    </AppCard>
  </div>
</template>
