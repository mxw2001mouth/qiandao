<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, Edit, UserX, ShoppingCart } from 'lucide-vue-next'
import type { Student, Attendance, LifecycleTag } from '../types'
import { useStudentStore } from '../stores/student'
import { useAuthStore } from '../stores/auth'
import { getStudentById } from '../db/repositories/studentRepository'
import { getStudentAttendanceHistory } from '../db/repositories/attendanceRepository'
import AppCard from '../components/ui/AppCard.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
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

onMounted(async () => {
  try {
    student.value = await getStudentById(studentId)
    const history = await getStudentAttendanceHistory(studentId)
    recentAttendances.value = history.slice(0, 5)
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
  absent: { label: '旷课', variant: 'danger' },
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

      <!-- 最近签到 -->
      <AppCard>
        <h3 class="font-bold text-slate-800 mb-3">最近签到</h3>
        <div v-if="recentAttendances.length === 0" class="text-sm text-slate-400 text-center py-4">
          暂无签到记录
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="record in recentAttendances"
            :key="record.id"
            class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
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
  </div>
</template>
