<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import { Edit3, Image } from 'lucide-vue-next'
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
import type { Attendance, AttendanceStatus } from '../types'

const authStore = useAuthStore()

const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const records = ref<(Attendance & { studentName: string })[]>([])
const isLoading = ref(false)
const photoUrl = ref<string | null>(null)
const showPhotoModal = ref(false)

// 修改弹窗
const showEditModal = ref(false)
const editingRecord = ref<(Attendance & { studentName: string }) | null>(null)
const editStatus = ref<AttendanceStatus>('present')
const editNotes = ref('')

const statusLabels: Record<AttendanceStatus, string> = {
  present: '到课',
  late: '迟到',
  leave: '请假',
  absent: '旷课',
}

const statusColors: Record<AttendanceStatus, 'success' | 'warning' | 'info' | 'danger'> = {
  present: 'success',
  late: 'warning',
  leave: 'info',
  absent: 'danger',
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

    // 加载合影
    const firstRecord = attendances[0]
    if (firstRecord && firstRecord.photo_path) {
      photoUrl.value = await readPhoto(firstRecord.photo_path)
    } else {
      photoUrl.value = null
    }
  } finally {
    isLoading.value = false
  }
}

// 打开修改弹窗
function openEdit(record: Attendance & { studentName: string }) {
  editingRecord.value = record
  editStatus.value = record.status
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
  await loadRecords()
}

watch(selectedDate, () => {
  loadRecords()
})

onMounted(() => {
  loadRecords()
})
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="签到记录" :show-back="true" />

    <!-- 日期选择 -->
    <div class="px-4 py-3">
      <input
        v-model="selectedDate"
        type="date"
        class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>

    <!-- 合影缩略图 -->
    <div v-if="photoUrl" class="px-4 mb-3">
      <button
        class="flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-2 text-sm text-indigo-600"
        @click="showPhotoModal = true"
      >
        <Image class="w-4 h-4" />
        查看当日合影
      </button>
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
            class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200"
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
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="(label, status) in statusLabels"
              :key="status"
              class="py-2 rounded-xl text-sm font-medium transition-all"
              :class="editStatus === status
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-600'"
              @click="editStatus = status as AttendanceStatus"
            >
              {{ label }}
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

    <!-- 合影查看弹窗 -->
    <AppModal v-model:visible="showPhotoModal" title="班级合影">
      <img v-if="photoUrl" :src="photoUrl" class="w-full rounded-xl" alt="班级合影" />
    </AppModal>

    <BottomNav />
  </div>
</template>
