<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Edit3 } from 'lucide-vue-next'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppModal from '../components/ui/AppModal.vue'
import { useAuthStore } from '../stores/auth'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as studentRepo from '../db/repositories/studentRepository'
import { readPhoto } from '../composables/useCamera'
import PhotoViewer from '../components/ui/PhotoViewer.vue'
import type { Attendance, AttendanceStatus } from '../types'

const authStore = useAuthStore()

const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const records = ref<(Attendance & { studentName: string })[]>([])
const isLoading = ref(false)
const photoUrl = ref<string | null>(null)
const hasPhotoPath = ref(false)
const showPhotoModal = ref(false)
const availableDates = ref<{ date: string; count: number; photo_path: string }[]>([])
const monthCursor = ref(dayjs(selectedDate.value).startOf('month'))
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 修改弹窗
const showEditModal = ref(false)
const editingRecord = ref<(Attendance & { studentName: string }) | null>(null)
const editStatus = ref<AttendanceStatus>('present')
const editNotes = ref('')

const statusLabels: Record<AttendanceStatus, string> = {
  present: '到课',
  late: '迟到',
  leave: '请假',
  absent: '请假',
}

const statusColors: Record<AttendanceStatus, 'success' | 'warning' | 'info' | 'danger'> = {
  present: 'success',
  late: 'warning',
  leave: 'info',
  absent: 'info',
}
const editableStatusOptions: AttendanceStatus[] = ['present', 'late', 'leave']

const markedDates = computed(() => new Set(availableDates.value.map(d => d.date)))
const monthLabel = computed(() => monthCursor.value.format('YYYY年M月'))
const monthDays = computed(() => {
  const monthStart = monthCursor.value.startOf('month')
  const startOffset = (monthStart.day() + 6) % 7
  const gridStart = monthStart.subtract(startOffset, 'day')
  return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'))
})

function dayKey(d: dayjs.Dayjs): string {
  return d.format('YYYY-MM-DD')
}
function isCurrentMonth(d: dayjs.Dayjs): boolean {
  return d.month() === monthCursor.value.month() && d.year() === monthCursor.value.year()
}
function isSelectedDate(d: dayjs.Dayjs): boolean {
  return dayKey(d) === selectedDate.value
}
function isMarked(d: dayjs.Dayjs): boolean {
  return markedDates.value.has(dayKey(d))
}
function selectDay(d: dayjs.Dayjs) {
  selectedDate.value = dayKey(d)
  monthCursor.value = d.startOf('month')
}
function prevMonth() {
  monthCursor.value = monthCursor.value.subtract(1, 'month').startOf('month')
}
function nextMonth() {
  monthCursor.value = monthCursor.value.add(1, 'month').startOf('month')
}

async function loadRecords() {
  isLoading.value = true
  try {
    const attendances = await attendanceRepo.getAttendanceByDate(selectedDate.value)
    // 获取学生信息
    const enriched: (Attendance & { studentName: string })[] = []
    for (const a of attendances) {
      const student = await studentRepo.getStudentById(a.student_id)
      enriched.push({
        ...a,
        studentName: student?.name || '未知学生',
      })
    }
    records.value = enriched

    // 加载合影：优先取当天第一条非空 photo_path，避免首条为空导致看不到合影
    const photoRecord = attendances.find(a => !!a.photo_path)
    hasPhotoPath.value = !!(photoRecord && photoRecord.photo_path)
    if (hasPhotoPath.value && photoRecord && photoRecord.photo_path) {
      photoUrl.value = await readPhoto(photoRecord.photo_path)
    } else {
      photoUrl.value = null
    }
  } finally {
    isLoading.value = false
  }
}

async function loadDateOptions() {
  availableDates.value = await attendanceRepo.getAttendanceDates(30)
  if (availableDates.value.length > 0) {
    const exists = availableDates.value.some(d => d.date === selectedDate.value)
    if (!exists) {
      selectedDate.value = availableDates.value[0]!.date
    }
  }
  monthCursor.value = dayjs(selectedDate.value).startOf('month')
}

// 打开修改弹窗
function openEdit(record: Attendance & { studentName: string }) {
  editingRecord.value = record
  editStatus.value = record.status === 'absent' ? 'leave' : record.status
  editNotes.value = record.notes
  showEditModal.value = true
}

// 保存修改
async function saveEdit() {
  if (!editingRecord.value) return

  const oldStatus = editingRecord.value.status
  const newStatus = editStatus.value

  await attendanceRepo.updateAttendanceStatus(
    editingRecord.value.id,
    newStatus,
    editNotes.value,
    authStore.userName || '管理员'
  )

  // 课时调整：如果状态变化涉及扣除/恢复
  const deductsHour = (s: AttendanceStatus) => s === 'present' || s === 'late'
  if (deductsHour(oldStatus) && !deductsHour(newStatus)) {
    // 原来扣了，现在不扣 → 恢复1课时
    await studentRepo.addHours(editingRecord.value.student_id, 1)
  } else if (!deductsHour(oldStatus) && deductsHour(newStatus)) {
    // 原来不扣，现在扣 → 扣1课时
    await studentRepo.deductHours(editingRecord.value.student_id, 1)
  }

  showEditModal.value = false
  editingRecord.value = null
  await loadDateOptions()
  await loadRecords()
}

watch(selectedDate, () => {
  loadRecords()
})

onMounted(() => {
  loadDateOptions().then(loadRecords)
})
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="签到记录" :show-back="true" />

    <!-- 日期选择（月历 + 近30天快捷） -->
    <div class="px-4 py-3">
      <AppCard class="!p-3">
        <div class="flex items-center justify-between mb-2">
          <button
            class="w-11 h-11 rounded-xl active:bg-slate-100 flex items-center justify-center"
            aria-label="查看上个月"
            @click="prevMonth"
          >
            <ChevronLeft class="w-4 h-4 text-slate-600" />
          </button>
          <div class="text-sm font-semibold text-slate-700">{{ monthLabel }}</div>
          <button
            class="w-11 h-11 rounded-xl active:bg-slate-100 flex items-center justify-center"
            aria-label="查看下个月"
            @click="nextMonth"
          >
            <ChevronRight class="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div class="grid grid-cols-7 mb-1">
          <div v-for="d in weekDays" :key="d" class="text-center text-xs text-slate-400 py-1">{{ d }}</div>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="d in monthDays"
            :key="dayKey(d)"
            class="relative rounded-xl min-h-[44px] flex items-center justify-center transition-colors"
            :class="[
              isSelectedDate(d) ? 'bg-indigo-500 text-white' : 'active:bg-slate-100',
              isCurrentMonth(d) ? '' : 'text-slate-300',
            ]"
            @click="selectDay(d)"
          >
            <span class="text-xs">{{ d.date() }}</span>
            <span
              v-if="isMarked(d)"
              class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
              :class="isSelectedDate(d) ? 'bg-white/90' : 'bg-emerald-500'"
            />
          </button>
        </div>
      </AppCard>

      <div v-if="availableDates.length > 0" class="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
        <button
          v-for="item in availableDates"
          :key="item.date"
          class="shrink-0 h-10 px-3 rounded-xl text-xs border transition-colors"
          :class="selectedDate === item.date
            ? 'bg-indigo-500 text-white border-indigo-500'
            : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50'"
          @click="selectedDate = item.date"
        >
          {{ item.date }} ({{ item.count }})
        </button>
      </div>
    </div>

    <!-- 合影区域（始终显示） -->
    <div class="px-4 mb-3">
      <AppCard class="!p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm font-semibold text-slate-700">{{ selectedDate }} 合影</p>
            <p class="text-xs text-slate-400">签到凭证</p>
          </div>
          <AppButton size="sm" :disabled="!photoUrl" @click="showPhotoModal = true">
            查看合影
          </AppButton>
        </div>

        <div
          v-if="photoUrl"
          class="relative rounded-xl overflow-hidden cursor-pointer active:opacity-90"
          @click="showPhotoModal = true"
        >
          <img :src="photoUrl" class="w-full object-cover max-h-52" alt="当日合影" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 px-3 py-2">
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-7 text-center"
        >
          <p class="text-sm text-slate-500">
            {{ hasPhotoPath ? '该日期有合影记录，但当前设备无法读取。' : '该日期暂无合影。' }}
          </p>
        </div>
      </AppCard>
    </div>

    <!-- 记录列表 -->
    <div v-if="isLoading" class="text-center py-10 text-slate-400">加载中...</div>
    <div v-else-if="records.length === 0" class="text-center py-10 text-slate-400">
      该日期暂无签到记录
    </div>
    <div v-else class="px-4 space-y-2">
      <AppCard v-for="record in records" :key="record.id">
        <div class="flex items-center gap-3">
          <AppAvatar :name="record.studentName" size="md" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-800">{{ record.studentName }}</span>
              <AppBadge
                :label="statusLabels[record.status]"
                :variant="statusColors[record.status]"
              />
            </div>
            <p v-if="record.notes" class="text-xs text-slate-500 mt-0.5 truncate">
              {{ record.notes }}
            </p>
            <p v-if="record.modified_at" class="text-xs text-orange-500 mt-0.5">
              已修改（原：{{ statusLabels[record.original_status as AttendanceStatus] || record.original_status }}）
            </p>
          </div>
          <!-- 管理员可修改 -->
          <button
            v-if="authStore.isAdmin"
            class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200"
            aria-label="修改签到状态"
            @click="openEdit(record)"
          >
            <Edit3 class="w-4 h-4" />
          </button>
        </div>
      </AppCard>
    </div>

    <!-- 修改签到状态弹窗 -->
    <AppModal v-model:visible="showEditModal" title="修改签到状态">
      <div v-if="editingRecord" class="space-y-4">
        <p class="text-sm text-slate-600">
          学生：<span class="font-medium">{{ editingRecord.studentName }}</span>
        </p>

        <!-- 状态选择 -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">签到状态</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="status in editableStatusOptions"
              :key="status"
              class="py-2 rounded-xl text-sm font-medium transition-all"
              :class="editStatus === status
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-600'"
              @click="editStatus = status as AttendanceStatus"
            >
              {{ statusLabels[status] }}
            </button>
          </div>
        </div>

        <!-- 备注 -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">备注</label>
          <textarea
            v-model="editNotes"
            class="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows="2"
            placeholder="修改备注（选填）"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <AppButton variant="secondary" class="flex-1" @click="showEditModal = false">
            取消
          </AppButton>
          <AppButton class="flex-1" @click="saveEdit">
            保存修改
          </AppButton>
        </div>
      </div>
    </AppModal>

    <!-- 合影查看（支持捏合缩放） -->
    <PhotoViewer v-model:visible="showPhotoModal" :src="photoUrl" title="班级合影" />

    <BottomNav />
  </div>
</template>
