<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import {
  Camera,
  CheckCircle,
  Clock,
  FileText,
  History,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import StatCard from '../components/ui/StatCard.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import PhotoViewer from '../components/ui/PhotoViewer.vue'
import { useAttendanceStore } from '../stores/attendance'
import { useStudentStore } from '../stores/student'
import { takeGroupPhoto, readPhoto } from '../composables/useCamera'
import { Capacitor } from '@capacitor/core'
import { hasAttendanceForDate } from '../db/repositories/attendanceRepository'
import type { AttendanceStatus } from '../types'

const attendanceStore = useAttendanceStore()
const studentStore = useStudentStore()
const router = useRouter()

const today = dayjs().format('YYYY-MM-DD')
const isLoading = ref(true)
const alreadySubmitted = ref(false)
const showConfirmModal = ref(false)
const showNeedPhotoModal = ref(false)
const showNotesModal = ref(false)
const currentNoteStudentId = ref<number | null>(null)
const noteText = ref('')
const photoTaking = ref(false)
const photoDataUri = ref<string | null>(null)
const showPhotoModal = ref(false)

async function loadPhoto() {
  const path = attendanceStore.groupPhoto
  if (path) {
    photoDataUri.value = await readPhoto(path)
  } else {
    photoDataUri.value = null
  }
}

// 仅显示有剩余课时的在读学生，并按课时预警颜色排序
const sortedStudents = computed(() => {
  return studentStore.activeStudents
    .filter(s => s.remaining_hours > 0)
    .sort((a, b) => {
    const colorA = studentStore.getStudentColor(a.remaining_hours)
    const colorB = studentStore.getStudentColor(b.remaining_hours)
    const order = { danger: 0, warning: 1, success: 2 }
    return order[colorA] - order[colorB]
  })
})

// 统计数据
const stats = computed(() => {
  const total = sortedStudents.value.length
  let present = 0, late = 0, leave = 0
  for (const student of sortedStudents.value) {
    const record = attendanceStore.getStatus(student.id)
    if (!record) continue
    switch (record.status) {
      case 'present': present++; break
      case 'late': late++; break
      case 'leave':
      case 'absent':
        leave++
        break
    }
  }
  const attended = present + late
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0
  return { total, present, late, leave, attended, rate }
})

// 签到状态按钮（统一为到课/迟到/请假三类，不单独展示其他类别）
const statusButtons: { status: AttendanceStatus; label: string; icon: typeof CheckCircle; activeClass: string }[] = [
  { status: 'present', label: '到课', icon: CheckCircle, activeClass: 'bg-green-500 text-white' },
  { status: 'late', label: '迟到', icon: Clock, activeClass: 'bg-yellow-500 text-white' },
  { status: 'leave', label: '请假', icon: FileText, activeClass: 'bg-blue-500 text-white' },
]

// 根据姓名 hash 生成一致的背景色
const nameColors = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#6366F1', '#3B82F6', '#14B8A6', '#22C55E',
  '#F59E0B', '#E11D48', '#7C3AED', '#0EA5E9',
]
function getNameColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return nameColors[Math.abs(hash) % nameColors.length] ?? '#6366F1'
}

// 课时颜色
function hoursClass(hours: number): string {
  const color = studentStore.getStudentColor(hours)
  if (color === 'danger') return 'text-red-500'
  if (color === 'warning') return 'text-yellow-500'
  return 'text-green-600'
}

// 设置签到状态
function setStatus(studentId: number, status: AttendanceStatus) {
  if (alreadySubmitted.value) return
  if (status === 'leave') {
    currentNoteStudentId.value = studentId
    noteText.value = attendanceStore.getStatus(studentId)?.notes || ''
    showNotesModal.value = true
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

// 拍摄合影
async function handleTakePhoto() {
  photoTaking.value = true
  try {
    const uri = await takeGroupPhoto()
    attendanceStore.setGroupPhoto(uri)
    await loadPhoto()
  } catch (e) {
    console.error('拍照失败:', e)
  } finally {
    photoTaking.value = false
  }
}

// 提交签到
async function handleSubmit() {
  showConfirmModal.value = false
  try {
    await attendanceStore.submitAll(today)
    alreadySubmitted.value = true
    await studentStore.fetchStudents()
    await loadPhoto()
  } catch (e) {
    console.error('提交失败:', e)
  }
}

// 检查是否所有学生都已标记状态
const allMarked = computed(() => {
  return sortedStudents.value.every(s => attendanceStore.getStatus(s.id))
})
const shouldShowSubmitButton = computed(() => {
  return !alreadySubmitted.value && !isLoading.value && stats.value.total > 0
})
function handleSubmitClick() {
  // native 设备必须先拍合影；浏览器预览环境跳过此限制
  if (Capacitor.isNativePlatform() && !attendanceStore.groupPhoto) {
    showNeedPhotoModal.value = true
    return
  }
  showConfirmModal.value = true
}

onMounted(async () => {
  isLoading.value = true
  try {
    await studentStore.fetchStudents()
    const exists = await hasAttendanceForDate(today)
    if (exists) {
      await attendanceStore.fetchByDate(today)
      alreadySubmitted.value = true
      await loadPhoto()
    } else {
      attendanceStore.reset()
      attendanceStore.setAllPresent(sortedStudents.value.map(s => s.id))
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
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 active:bg-slate-200"
            @click="router.push('/attendance/history')"
          >
            <History class="w-3.5 h-3.5" />
            历史
          </button>
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
        </div>
      </template>
    </AppHeader>

    <div class="px-4 pt-3 space-y-3">
      <!-- 日期 -->
      <p class="text-sm text-slate-500">{{ dayjs(today).format('YYYY年M月D日 dddd') }}</p>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-2">
        <StatCard :value="stats.total" label="应到" />
        <StatCard :value="stats.attended" label="实到" :gradient="true" />
        <StatCard :value="`${stats.rate}%`" label="出勤率" />
      </div>

      <!-- 详细统计条 -->
      <AppCard class="!p-3">
        <div class="grid grid-cols-3 gap-2">
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
        </div>
      </AppCard>
    </div>

    <!-- 已提交提示 + 合影 -->
    <div v-if="alreadySubmitted" class="mx-4 mt-3 mb-4 space-y-3">
      <div class="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
        <p class="text-green-700 font-medium text-sm">今日签到已提交</p>
        <button
          class="flex items-center gap-1 text-xs text-indigo-500 font-medium"
          @click="router.push('/attendance/history')"
        >
          <History class="w-3.5 h-3.5" />
          历史签到
        </button>
      </div>

      <!-- 合影（提交后显示，含日期水印，可拿给家长查看） -->
      <div v-if="photoDataUri" class="relative rounded-xl overflow-hidden cursor-pointer shadow" @click="showPhotoModal = true">
        <img :src="photoDataUri" class="w-full object-cover" alt="今日合影" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div class="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between">
          <div>
            <p class="text-white text-sm font-semibold leading-tight">今日合影</p>
            <p class="text-white/70 text-xs">含日期水印，点击全屏查看</p>
          </div>
          <span class="bg-white/20 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">全屏</span>
        </div>
      </div>
    </div>

    <!-- 学生列表 -->
    <div v-if="isLoading" class="mt-4 text-center py-10 text-slate-400">加载中...</div>
    <div v-else-if="sortedStudents.length === 0" class="mt-4 px-4 py-10 text-center text-slate-400 text-sm">
      当前无可签到学生（剩余课时需大于0）
    </div>
    <div v-else class="mt-4 px-4 space-y-3" :class="{ 'pb-16': shouldShowSubmitButton }">
      <AppCard
        v-for="student in sortedStudents"
        :key="student.id"
        class="!p-3"
        :class="student.remaining_hours <= 0 ? 'ring-2 ring-red-300' : ''"
      >
        <!-- 姓名（左）| 弹性空白 | 剩余X课时（中右）| 操作按钮（右） -->
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span
            class="text-xs font-medium px-2 py-1 rounded-md text-white shrink-0 max-w-[5.5rem] truncate"
            :style="{ backgroundColor: getNameColor(student.name) }"
          >{{ student.name }}</span>

          <span
            class="text-xs font-semibold tabular-nums text-center"
            :class="hoursClass(student.remaining_hours)"
          >剩余{{ student.remaining_hours }}课时</span>

          <div class="flex gap-1 shrink-0">
            <button
              v-for="btn in statusButtons"
              :key="btn.status"
              class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
              :class="attendanceStore.getStatus(student.id)?.status === btn.status
                ? btn.activeClass
                : 'bg-slate-100 text-slate-400'"
              :disabled="alreadySubmitted"
              :title="btn.label"
              @click="setStatus(student.id, btn.status)"
            >
              <component :is="btn.icon" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <!-- 请假备注（有才显示，不占正常高度） -->
        <p
          v-if="attendanceStore.getStatus(student.id)?.status === 'leave' && attendanceStore.getStatus(student.id)?.notes"
          class="text-xs text-blue-500 mt-1 pl-1 truncate"
        >{{ attendanceStore.getStatus(student.id)?.notes }}</p>
      </AppCard>
    </div>

    <!-- 提交按钮 -->
    <div
      v-if="shouldShowSubmitButton"
      class="fixed left-0 right-0 px-4 z-30"
      :style="{ bottom: 'calc(var(--safe-bottom) + 5rem)' }"
    >
      <AppButton
        class="w-full"
        size="lg"
        :loading="attendanceStore.isSubmitting"
        :disabled="!allMarked"
        @click="handleSubmitClick"
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

    <AppModal v-model:visible="showNeedPhotoModal" title="先拍合影">
      <div class="space-y-3">
        <p class="text-slate-600">提交签到前需要先拍摄班级合影。</p>
        <div class="flex gap-3">
          <AppButton variant="secondary" class="flex-1" @click="showNeedPhotoModal = false">
            知道了
          </AppButton>
          <AppButton
            class="flex-1"
            :loading="photoTaking"
            :disabled="alreadySubmitted || photoTaking"
            @click="showNeedPhotoModal = false; handleTakePhoto()"
          >
            去拍照
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

    <!-- 合影全屏查看（支持捏合缩放） -->
    <PhotoViewer v-model:visible="showPhotoModal" :src="photoDataUri" title="今日合影" />

    <BottomNav />
  </div>
</template>
