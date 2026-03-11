<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import {
  Camera,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  Users,
  UserCheck,
  AlertTriangle,
} from 'lucide-vue-next'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import StatCard from '../components/ui/StatCard.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppModal from '../components/ui/AppModal.vue'
import { useAttendanceStore } from '../stores/attendance'
import { useStudentStore } from '../stores/student'
import { hasAttendanceForDate } from '../db/repositories/attendanceRepository'
import type { AttendanceStatus } from '../types'

const attendanceStore = useAttendanceStore()
const studentStore = useStudentStore()

const today = dayjs().format('YYYY-MM-DD')
const isLoading = ref(true)
const alreadySubmitted = ref(false)
const showConfirmModal = ref(false)
const showNotesModal = ref(false)
const currentNoteStudentId = ref<number | null>(null)
const noteText = ref('')
const photoTaking = ref(false)
const photoFileInput = ref<HTMLInputElement>()

// 按课时排序：红色（0课时）置顶，然后黄色，然后绿色
const sortedStudents = computed(() => {
  return [...studentStore.activeStudents].sort((a, b) => {
    const colorA = studentStore.getStudentColor(a.remaining_hours)
    const colorB = studentStore.getStudentColor(b.remaining_hours)
    const order = { danger: 0, warning: 1, success: 2 }
    return order[colorA] - order[colorB]
  })
})

// 统计数据
const stats = computed(() => {
  const total = sortedStudents.value.length
  let present = 0, late = 0, leave = 0, absent = 0
  for (const student of sortedStudents.value) {
    const record = attendanceStore.getStatus(student.id)
    if (!record) continue
    switch (record.status) {
      case 'present': present++; break
      case 'late': late++; break
      case 'leave': leave++; break
      case 'absent': absent++; break
    }
  }
  const attended = present + late
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0
  return { total, present, late, leave, absent, attended, rate }
})

// 签到状态按钮配置
const statusButtons: { status: AttendanceStatus; label: string; icon: typeof CheckCircle; activeClass: string }[] = [
  { status: 'present', label: '到课', icon: CheckCircle, activeClass: 'bg-green-500 text-white' },
  { status: 'late', label: '迟到', icon: Clock, activeClass: 'bg-yellow-500 text-white' },
  { status: 'leave', label: '请假', icon: FileText, activeClass: 'bg-blue-500 text-white' },
  { status: 'absent', label: '旷课', icon: XCircle, activeClass: 'bg-red-500 text-white' },
]

// 课时徽章
function hoursLabel(hours: number): string {
  return `${hours}课时`
}

// 设置签到状态
function setStatus(studentId: number, status: AttendanceStatus) {
  if (alreadySubmitted.value) return
  // 请假时弹出备注框
  if (status === 'leave') {
    currentNoteStudentId.value = studentId
    noteText.value = attendanceStore.getStatus(studentId)?.notes || ''
    showNotesModal.value = true
    // 先设置状态
    attendanceStore.setStatus(studentId, status)
    return
  }
  attendanceStore.setStatus(studentId, status)
}

// 保存请假备注
function saveNote() {
  if (currentNoteStudentId.value !== null) {
    attendanceStore.setStatus(currentNoteStudentId.value, 'leave', noteText.value)
  }
  showNotesModal.value = false
  currentNoteStudentId.value = null
  noteText.value = ''
}

// 拍摄合影（Demo 版：触发文件选择）
async function handleTakePhoto() {
  photoFileInput.value?.click()
}

function onPhotoFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const url = URL.createObjectURL(file)
    attendanceStore.setGroupPhoto(url)
  }
}

// 提交签到
async function handleSubmit() {
  showConfirmModal.value = false
  try {
    await attendanceStore.submitAll(today)
    alreadySubmitted.value = true
    // 刷新学生数据（课时已变化）
    await studentStore.fetchStudents()
  } catch (e) {
    console.error('提交失败:', e)
  }
}

// 检查是否所有学生都已标记状态
const allMarked = computed(() => {
  return sortedStudents.value.every(s => attendanceStore.getStatus(s.id))
})

onMounted(async () => {
  isLoading.value = true
  try {
    await studentStore.fetchStudents()
    // 检查今日是否已有签到
    const exists = await hasAttendanceForDate(today)
    if (exists) {
      await attendanceStore.fetchByDate(today)
      alreadySubmitted.value = true
    } else {
      attendanceStore.reset()
      // 默认所有学生为"到课"
      attendanceStore.setAllPresent(studentStore.activeStudents.map(s => s.id))
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="今日签到">
      <template #actions>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          :class="attendanceStore.groupPhoto
            ? 'bg-green-100 text-green-700'
            : 'bg-indigo-50 text-indigo-600'"
          :disabled="alreadySubmitted || photoTaking"
          @click="handleTakePhoto"
        >
          <Camera class="w-4 h-4" />
          {{ attendanceStore.groupPhoto ? '已拍照' : '拍合影' }}
        </button>
      </template>
    </AppHeader>

    <!-- 日期 -->
    <div class="px-4 pt-3 pb-2">
      <p class="text-sm text-slate-500">{{ dayjs(today).format('YYYY年M月D日 dddd') }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-2 px-4 mb-4">
      <StatCard :value="stats.total" label="应到" :icon="Users" />
      <StatCard :value="stats.attended" label="实到" :icon="UserCheck" :gradient="true" />
      <StatCard :value="`${stats.rate}%`" label="出勤率" :icon="AlertTriangle" />
    </div>

    <!-- 详细统计条 -->
    <div class="flex justify-around px-4 mb-4">
      <div class="text-center">
        <span class="text-lg font-bold text-green-600">{{ stats.present }}</span>
        <p class="text-xs text-slate-500">到课</p>
      </div>
      <div class="text-center">
        <span class="text-lg font-bold text-yellow-600">{{ stats.late }}</span>
        <p class="text-xs text-slate-500">迟到</p>
      </div>
      <div class="text-center">
        <span class="text-lg font-bold text-blue-600">{{ stats.leave }}</span>
        <p class="text-xs text-slate-500">请假</p>
      </div>
      <div class="text-center">
        <span class="text-lg font-bold text-red-600">{{ stats.absent }}</span>
        <p class="text-xs text-slate-500">旷课</p>
      </div>
    </div>

    <!-- 已提交提示 -->
    <div v-if="alreadySubmitted" class="mx-4 mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
      <p class="text-green-700 font-medium text-sm">今日签到已提交</p>
    </div>

    <!-- 学生列表 -->
    <div v-if="isLoading" class="text-center py-10 text-slate-400">加载中...</div>
    <div v-else class="px-4 space-y-2">
      <AppCard
        v-for="student in sortedStudents"
        :key="student.id"
        :class="student.remaining_hours <= 0 ? 'ring-2 ring-red-300' : ''"
      >
        <div class="flex items-center gap-3">
          <!-- 头像 -->
          <AppAvatar :name="student.name" size="md" />

          <!-- 姓名和课时 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-800 truncate">{{ student.name }}</span>
              <AppBadge
                :label="hoursLabel(student.remaining_hours)"
                :variant="studentStore.getStudentColor(student.remaining_hours)"
              />
            </div>
            <!-- 请假备注 -->
            <p
              v-if="attendanceStore.getStatus(student.id)?.status === 'leave' && attendanceStore.getStatus(student.id)?.notes"
              class="text-xs text-blue-500 mt-0.5 truncate"
            >
              备注：{{ attendanceStore.getStatus(student.id)?.notes }}
            </p>
          </div>

          <!-- 签到状态按钮组 -->
          <div class="flex gap-1 shrink-0">
            <button
              v-for="btn in statusButtons"
              :key="btn.status"
              class="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
              :class="attendanceStore.getStatus(student.id)?.status === btn.status
                ? btn.activeClass
                : 'bg-slate-100 text-slate-400'"
              :disabled="alreadySubmitted"
              :title="btn.label"
              @click="setStatus(student.id, btn.status)"
            >
              <component :is="btn.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- 提交按钮 -->
    <div v-if="!alreadySubmitted && !isLoading" class="fixed bottom-20 left-0 right-0 px-4 z-30">
      <AppButton
        class="w-full"
        size="lg"
        :loading="attendanceStore.isSubmitting"
        :disabled="!allMarked"
        @click="showConfirmModal = true"
      >
        提交签到（{{ stats.total }}人）
      </AppButton>
    </div>

    <!-- 提交确认弹窗 -->
    <AppModal v-model:visible="showConfirmModal" title="确认提交签到">
      <div class="space-y-3">
        <p class="text-slate-600">确认提交今日签到记录？</p>
        <div class="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
          <p>到课：<span class="font-bold text-green-600">{{ stats.present }}人</span></p>
          <p>迟到：<span class="font-bold text-yellow-600">{{ stats.late }}人</span></p>
          <p>请假：<span class="font-bold text-blue-600">{{ stats.leave }}人</span></p>
          <p>旷课：<span class="font-bold text-red-600">{{ stats.absent }}人</span></p>
        </div>
        <p class="text-xs text-slate-400">提交后将自动扣除到课和迟到学生各1课时</p>
        <div class="flex gap-3 pt-2">
          <AppButton variant="secondary" class="flex-1" @click="showConfirmModal = false">
            取消
          </AppButton>
          <AppButton class="flex-1" :loading="attendanceStore.isSubmitting" @click="handleSubmit">
            确认提交
          </AppButton>
        </div>
      </div>
    </AppModal>

    <!-- 请假备注弹窗 -->
    <AppModal v-model:visible="showNotesModal" title="请假备注">
      <div class="space-y-3">
        <textarea
          v-model="noteText"
          class="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          rows="3"
          placeholder="请输入请假原因（选填）"
        />
        <div class="flex gap-3">
          <AppButton variant="secondary" class="flex-1" @click="showNotesModal = false">
            跳过
          </AppButton>
          <AppButton class="flex-1" @click="saveNote">
            保存
          </AppButton>
        </div>
      </div>
    </AppModal>

    <!-- 隐藏文件输入 -->
    <input
      ref="photoFileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onPhotoFileChange"
    />

    <BottomNav />
  </div>
</template>
