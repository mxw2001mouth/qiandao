<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Phone, MessageSquare, ShoppingCart } from 'lucide-vue-next'
import type { Followup, FollowupStatus } from '../types'
import { useStudentStore } from '../stores/student'
import { useAuthStore } from '../stores/auth'
import { getPendingFollowups, upsertFollowup } from '../db/repositories/followupRepository'
import { ensureFollowupsForWarningStudents } from '../db/repositories/followupRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import AppInput from '../components/ui/AppInput.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'

const router = useRouter()
const studentStore = useStudentStore()
const auth = useAuthStore()

type FollowupItem = Followup & { student_name: string; remaining_hours: number }

const followups = ref<FollowupItem[]>([])
const loading = ref(true)

// 跟进备注弹窗
const showNoteModal = ref(false)
const activeItem = ref<FollowupItem | null>(null)
const noteText = ref('')
const nextStatus = ref<FollowupStatus>('contacted')

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    // 先确保预警学生有跟进记录
    const threshold = await getWarningThreshold()
    await ensureFollowupsForWarningStudents(threshold)
    // 加载跟进列表
    followups.value = await getPendingFollowups()
  } catch {
    followups.value = []
  } finally {
    loading.value = false
  }
}

const statusLabel: Record<string, string> = {
  pending: '未联系',
  contacted: '已联系',
  renewed: '已续费',
}

const statusVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  pending: 'danger',
  contacted: 'warning',
  renewed: 'success',
}

function openStatusModal(item: FollowupItem, status: FollowupStatus) {
  activeItem.value = item
  nextStatus.value = status
  noteText.value = item.notes || ''
  showNoteModal.value = true
}

async function confirmStatusUpdate() {
  if (!activeItem.value) return
  await upsertFollowup(activeItem.value.student_id, nextStatus.value, noteText.value)
  showNoteModal.value = false
  await loadData()
}

function goToPurchase(studentId: number) {
  router.push(`/students/${studentId}/purchase`)
}

function goToDetail(studentId: number) {
  router.push(`/students/${studentId}`)
}
</script>

<template>
  <div class="min-h-screen bg-bg pb-20">
    <AppHeader title="课时管理" />
    <div class="p-4">
      <!-- 加载 -->
      <div v-if="loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- 空状态 -->
      <div v-else-if="followups.length === 0" class="text-center py-20 text-slate-400">
        <p class="text-sm">暂无需要跟进的学生</p>
        <p class="text-xs mt-1">课时充足的学生不会出现在此列表</p>
      </div>

      <!-- 跟进列表 -->
      <div v-else class="space-y-3">
        <AppCard
          v-for="item in followups"
          :key="item.id"
          class="cursor-pointer"
          @click="goToDetail(item.student_id)"
        >
          <div class="flex items-start gap-3">
            <AppAvatar :name="item.student_name" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800 truncate">{{ item.student_name }}</span>
                <AppBadge
                  :label="statusLabel[item.status] || item.status"
                  :variant="statusVariant[item.status] || 'info'"
                />
              </div>
              <div class="flex items-center gap-2 mt-1">
                <AppBadge
                  :label="`${item.remaining_hours} 课时`"
                  :variant="studentStore.getStudentColor(item.remaining_hours)"
                />
              </div>
              <p v-if="item.notes" class="text-xs text-slate-400 mt-1 truncate">
                {{ item.notes }}
              </p>
            </div>

            <!-- 剩余课时 -->
            <div class="text-right shrink-0">
              <div
                :class="[
                  'text-2xl font-bold',
                  item.remaining_hours <= 0 ? 'text-red-500' : 'text-yellow-500',
                ]"
              >
                {{ item.remaining_hours }}
              </div>
              <div class="text-xs text-slate-400">剩余</div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 mt-3 pt-3 border-t border-slate-50" @click.stop>
            <AppButton
              v-if="item.status === 'pending'"
              variant="secondary"
              size="sm"
              class="flex-1"
              @click="openStatusModal(item, 'contacted')"
            >
              <Phone class="w-3.5 h-3.5 mr-1" />
              标记已联系
            </AppButton>
            <AppButton
              v-if="item.status === 'contacted'"
              variant="secondary"
              size="sm"
              class="flex-1"
              @click="openStatusModal(item, 'contacted')"
            >
              <MessageSquare class="w-3.5 h-3.5 mr-1" />
              更新备注
            </AppButton>
            <AppButton
              v-if="auth.isAdmin"
              variant="primary"
              size="sm"
              class="flex-1"
              @click="goToPurchase(item.student_id)"
            >
              <ShoppingCart class="w-3.5 h-3.5 mr-1" />
              续费
            </AppButton>
          </div>
        </AppCard>
      </div>

      <!-- 备注 Modal -->
      <AppModal v-model:visible="showNoteModal" :title="nextStatus === 'contacted' ? '跟进备注' : '更新状态'">
        <div class="space-y-4">
          <AppInput
            v-model="noteText"
            label="备注"
            placeholder="例如：家长说下周来续费"
          />
          <div class="flex gap-3">
            <AppButton variant="secondary" size="sm" class="flex-1" @click="showNoteModal = false">
              取消
            </AppButton>
            <AppButton size="sm" class="flex-1" @click="confirmStatusUpdate">
              确认
            </AppButton>
          </div>
        </div>
      </AppModal>
    </div>
    <BottomNav />
  </div>
</template>
