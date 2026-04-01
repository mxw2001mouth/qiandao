<script setup lang="ts">
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { Download, User, CalendarDays, CheckCircle } from 'lucide-vue-next'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import { useStudentStore } from '../stores/student'
import { exportByStudent, exportByMonth } from '../utils/excelExport'

const studentStore = useStudentStore()

type ExportType = 'student' | 'month'
const exportType = ref<ExportType>('student')
const selectedStudentId = ref<number | null>(null)
const selectedMonth = ref(dayjs().format('YYYY-MM'))
const isExporting = ref(false)
const showResultModal = ref(false)
const resultPath = ref('')
const exportError = ref('')

onMounted(async () => {
  await studentStore.fetchStudents()
  if (studentStore.activeStudents.length > 0) {
    selectedStudentId.value = studentStore.activeStudents[0]!.id
  }
})

async function handleExport() {
  isExporting.value = true
  exportError.value = ''
  try {
    if (exportType.value === 'student') {
      if (!selectedStudentId.value) return
      resultPath.value = await exportByStudent(selectedStudentId.value)
    } else {
      resultPath.value = await exportByMonth(selectedMonth.value)
    }
    showResultModal.value = true
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : '导出失败，请重试'
    console.error('导出失败:', e)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="数据导出" :show-back="true" />

    <div class="px-4 pt-4 space-y-4">
      <!-- 导出类型选择 -->
      <AppCard>
        <h3 class="text-sm font-medium text-slate-700 mb-3">导出类型</h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="h-11 flex items-center gap-2 px-4 rounded-xl text-sm font-medium transition-all"
            :class="exportType === 'student' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'"
            @click="exportType = 'student'"
          >
            <User class="w-4 h-4" />
            按学生导出
          </button>
          <button
            class="h-11 flex items-center gap-2 px-4 rounded-xl text-sm font-medium transition-all"
            :class="exportType === 'month' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'"
            @click="exportType = 'month'"
          >
            <CalendarDays class="w-4 h-4" />
            按月导出
          </button>
        </div>
      </AppCard>

      <!-- 按学生导出：学生选择器 -->
      <AppCard v-if="exportType === 'student'">
        <h3 class="text-sm font-medium text-slate-700 mb-3">选择学生</h3>
        <select
          v-model="selectedStudentId"
          class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option v-for="s in studentStore.activeStudents" :key="s.id" :value="s.id">
            {{ s.name }}（{{ s.class_name }}）
          </option>
        </select>
        <p class="text-xs text-slate-400 mt-2">导出该学生的签到记录和购课历史</p>
      </AppCard>

      <!-- 按月导出：月份选择器 -->
      <AppCard v-if="exportType === 'month'">
        <h3 class="text-sm font-medium text-slate-700 mb-3">选择月份</h3>
        <input
          v-model="selectedMonth"
          type="month"
          class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <p class="text-xs text-slate-400 mt-2">导出所有学生当月出勤汇总表</p>
      </AppCard>

      <!-- 错误提示 -->
      <div v-if="exportError" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <span class="text-red-500 text-sm">{{ exportError }}</span>
      </div>

      <!-- 导出按钮 -->
      <AppButton
        class="w-full"
        size="lg"
        :loading="isExporting"
        :disabled="exportType === 'student' && !selectedStudentId"
        @click="handleExport"
      >
        <Download class="w-5 h-5 mr-2" />
        开始导出
      </AppButton>
    </div>

    <!-- 导出成功弹窗 -->
    <AppModal v-model:visible="showResultModal" title="导出成功">
      <div class="space-y-3">
        <div class="flex items-center gap-3 text-green-600">
          <CheckCircle class="w-8 h-8" />
          <p class="font-medium">Excel 文件已导出</p>
        </div>
        <div class="bg-slate-50 rounded-xl p-3">
          <p class="text-xs text-slate-500 mb-1">文件路径</p>
          <p class="text-sm text-slate-700 break-all">{{ resultPath }}</p>
        </div>
        <p class="text-xs text-slate-400">请使用文件管理器在 Documents 目录中查找</p>
        <AppButton class="w-full" @click="showResultModal = false">
          确定
        </AppButton>
      </div>
    </AppModal>

    <BottomNav />
  </div>
</template>
