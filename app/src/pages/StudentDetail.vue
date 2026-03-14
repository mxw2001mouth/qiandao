<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, Edit, UserX, ShoppingCart, Download, Image } from 'lucide-vue-next'
import type { Student, Attendance, LifecycleTag } from '../types'
import { useStudentStore } from '../stores/student'
import { useAuthStore } from '../stores/auth'
import { getStudentById } from '../db/repositories/studentRepository'
import { getStudentAttendanceHistory, getAttendanceByDate, getDailyStats } from '../db/repositories/attendanceRepository'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { readPhoto } from '../composables/useCamera'
import AppCard from '../components/ui/AppCard.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import PhotoViewer from '../components/ui/PhotoViewer.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const auth = useAuthStore()

const student = ref<Student | null>(null)
const recentAttendances = ref<Attendance[]>([])
const loading = ref(true)
const showArchiveModal = ref(false)

const studentId = Number(route.params.id)

// 当天签到详情弹窗
const showDayModal = ref(false)
const dayModalDate = ref('')
const dayModalStats = ref({ total: 0, present: 0, late: 0, leave: 0 })
const dayModalRecords = ref<{ name: string; status: string }[]>([])
const dayModalPhoto = ref<string | null>(null)
const dayModalLoading = ref(false)
const showPhotoModal = ref(false)
const downloadMsg = ref('')

onMounted(async () => {
  try {
    student.value = await getStudentById(studentId)
    const history = await getStudentAttendanceHistory(studentId)
    recentAttendances.value = history.slice(0, 10)
  } catch {
    // DB 未初始化
  } finally {
    loading.value = false
  }
})

const lifecycleLabels: Record<LifecycleTag, string> = {
  new: '新生',
  active: '活跃',
  warning: '预警',
  at_risk: '流失风险',
}

const lifecycleVariants: Record<LifecycleTag, 'success' | 'warning' | 'danger' | 'info'> = {
  new: 'info',
  active: 'success',
  warning: 'warning',
  at_risk: 'danger',
}

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  present: { label: '到课', variant: 'success' },
  late: { label: '迟到', variant: 'warning' },
  leave: { label: '请假', variant: 'info' },
  absent: { label: '请假', variant: 'info' },
}

function goToEdit() {
  router.push(`/students/${studentId}/edit`)
}

function goToPurchase() {
  router.push(`/students/${studentId}/purchase`)
}

async function confirmArchive() {
  await studentStore.archiveStudent(studentId)
  showArchiveModal.value = false
  router.back()
}

// 点击签到日期查看当天整体签到情况
async function onDateClick(record: Attendance) {
  showDayModal.value = true
  dayModalDate.value = record.date
  dayModalLoading.value = true
  dayModalPhoto.value = null
  dayModalRecords.value = []

  try {
    dayModalStats.value = await getDailyStats(record.date)
    const attendances = await getAttendanceByDate(record.date)
    const enriched: { name: string; status: string }[] = []
    for (const a of attendances) {
      const s = await getStudentById(a.student_id)
      enriched.push({ name: s?.name || `学生${a.student_id}`, status: a.status })
    }
    dayModalRecords.value = enriched

    // 加载合影
    if (record.photo_path) {
      dayModalPhoto.value = await readPhoto(record.photo_path)
    }
  } catch {
    // 忽略错误
  } finally {
    dayModalLoading.value = false
  }
}

// 下载合影到 Documents
async function downloadPhoto() {
  if (!dayModalPhoto.value) return
  try {
    const base64 = dayModalPhoto.value.replace('data:image/jpeg;base64,', '')
    await Filesystem.writeFile({
      path: `qiandao/签到合影_${dayModalDate.value}.jpg`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    })
    downloadMsg.value = '已保存到 Documents/qiandao/'
    setTimeout(() => { downloadMsg.value = '' }, 3000)
  } catch {
    downloadMsg.value = '保存失败'
    setTimeout(() => { downloadMsg.value = '' }, 2000)
  }
}
</script>

<template>
  <div class="p-4">
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <div v-else-if="!student" class="text-center py-20 text-slate-400">
      <p>学生不存在</p>
    </div>

    <div v-else class="space-y-4">
      <!-- 基本信息卡片 -->
      <AppCard>
        <div class="flex items-start gap-4">
          <AppAvatar :name="student.name" size="lg" />
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-slate-800">{{ student.name }}</h2>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <AppBadge :label="student.class_name" variant="info" />
              <AppBadge
                :label="`${student.remaining_hours} 课时`"
                :variant="studentStore.getStudentColor(student.remaining_hours)"
              />
              <AppBadge
                :label="lifecycleLabels[student.lifecycle_tag]"
                :variant="lifecycleVariants[student.lifecycle_tag]"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-slate-500">家长姓名</span>
            <span class="text-slate-800 font-medium">{{ student.parent_name }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">联系电话</span>
            <a :href="`tel:${student.parent_phone}`" class="text-indigo-500 font-medium flex items-center gap-1">
              <Phone class="w-3.5 h-3.5" />
              {{ student.parent_phone }}
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">总购课时</span>
            <span class="text-slate-800 font-medium">{{ student.total_hours }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">剩余课时</span>
            <span
              :class="[
                'font-bold text-lg',
                studentStore.getStudentColor(student.remaining_hours) === 'danger' ? 'text-red-500' :
                studentStore.getStudentColor(student.remaining_hours) === 'warning' ? 'text-yellow-500' :
                'text-green-500',
              ]"
            >
              {{ student.remaining_hours }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">入学日期</span>
            <span class="text-slate-800 font-medium">{{ student.created_at?.substring(0, 10) }}</span>
          </div>
        </div>
      </AppCard>

      <!-- 管理员操作 -->
      <div v-if="auth.isAdmin" class="flex gap-3">
        <AppButton variant="secondary" size="sm" class="flex-1" @click="goToEdit">
          <Edit class="w-4 h-4 mr-1.5" />
          编辑
        </AppButton>
        <AppButton variant="secondary" size="sm" class="flex-1" @click="goToPurchase">
          <ShoppingCart class="w-4 h-4 mr-1.5" />
          续费
        </AppButton>
        <AppButton
          v-if="student.status === 'active'"
          variant="danger"
          size="sm"
          class="flex-1"
          @click="showArchiveModal = true"
        >
          <UserX class="w-4 h-4 mr-1.5" />
          退课
        </AppButton>
      </div>

      <!-- 最近签到（可点击查看当天详情） -->
      <AppCard>
        <h3 class="font-bold text-slate-800 mb-3">最近签到</h3>
        <div v-if="recentAttendances.length === 0" class="text-sm text-slate-400 text-center py-4">
          暂无签到记录
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="record in recentAttendances"
            :key="record.id"
            class="flex items-center justify-between py-2 px-2 border-b border-slate-50 last:border-0 rounded-lg active:bg-slate-50 cursor-pointer"
            @click="onDateClick(record)"
          >
            <span class="text-sm text-slate-600">{{ record.date }}</span>
            <AppBadge
              :label="statusMap[record.status]?.label || record.status"
              :variant="statusMap[record.status]?.variant || 'info'"
            />
          </div>
        </div>
      </AppCard>
    </div>

    <!-- 退课确认 -->
    <AppModal v-model:visible="showArchiveModal" title="确认退课">
      <p class="text-slate-600 mb-4">
        确定要将 <strong>{{ student?.name }}</strong> 设为退课状态吗？退课后将从活跃列表中移除，但历史数据保留。
      </p>
      <div class="flex gap-3">
        <AppButton variant="secondary" size="sm" class="flex-1" @click="showArchiveModal = false">
          取消
        </AppButton>
        <AppButton variant="danger" size="sm" class="flex-1" @click="confirmArchive">
          确认退课
        </AppButton>
      </div>
    </AppModal>

    <!-- 当天签到详情弹窗 -->
    <AppModal v-model:visible="showDayModal" :title="`${dayModalDate} 签到详情`">
      <div v-if="dayModalLoading" class="flex justify-center py-8">
        <LoadingSpinner />
      </div>
      <div v-else class="space-y-4">
        <!-- 统计概览 -->
        <div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3">
          <div class="text-center">
            <div class="text-xl font-bold text-green-600">{{ dayModalStats.present }}</div>
            <div class="text-[10px] text-slate-500">到课</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-yellow-500">{{ dayModalStats.late }}</div>
            <div class="text-[10px] text-slate-500">迟到</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-indigo-500">{{ dayModalStats.leave }}</div>
            <div class="text-[10px] text-slate-500">请假</div>
          </div>
        </div>

        <!-- 查看合影按钮（醒目入口） -->
        <AppButton
          class="w-full"
          :variant="dayModalPhoto ? 'primary' : 'secondary'"
          :disabled="!dayModalPhoto"
          @click="showPhotoModal = true"
        >
          <Image class="w-4 h-4 mr-1.5" />
          {{ dayModalPhoto ? '查看签到合影' : '暂无签到合影' }}
        </AppButton>

        <!-- 班级合影 -->
        <div v-if="dayModalPhoto" class="space-y-2">
          <div class="text-xs font-medium text-slate-500">班级合影（点击放大）</div>
          <div class="relative rounded-xl overflow-hidden">
            <img
              :src="dayModalPhoto"
              class="w-full cursor-pointer active:opacity-90"
              alt="班级合影"
              @click="showPhotoModal = true"
            />
            <button
              class="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 active:bg-black/70"
              @click.stop="downloadPhoto"
            >
              <Download class="w-3.5 h-3.5" />
              下载
            </button>
          </div>
          <p v-if="downloadMsg" class="text-xs text-center" :class="downloadMsg.includes('失败') ? 'text-red-500' : 'text-green-600'">
            {{ downloadMsg }}
          </p>
        </div>

        <!-- 学生签到列表 -->
        <div class="space-y-1.5 max-h-52 overflow-y-auto">
          <div
            v-for="(r, idx) in dayModalRecords"
            :key="idx"
            class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
          >
            <span class="text-sm text-slate-700">{{ r.name }}</span>
            <AppBadge
              :label="statusMap[r.status]?.label || r.status"
              :variant="statusMap[r.status]?.variant || 'info'"
            />
          </div>
        </div>
      </div>
    </AppModal>

    <!-- 合影放大查看（支持捏合缩放） -->
    <PhotoViewer v-model:visible="showPhotoModal" :src="dayModalPhoto" title="班级合影" />
  </div>
</template>
