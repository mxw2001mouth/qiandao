<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Phone, MessageSquare, ShoppingCart, ChevronRight } from 'lucide-vue-next'
import type { Followup, FollowupStatus } from '../types'
import { useStudentStore } from '../stores/student'
import { useAuthStore } from '../stores/auth'
import { getPendingFollowups, upsertFollowup } from '../db/repositories/followupRepository'
import { ensureFollowupsForWarningStudents } from '../db/repositories/followupRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'
import AppCard from '../components/ui/AppCard.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
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
const activeFilter = ref<'pending' | 'contacted'>('pending')

// 跟进备注弹窗
const showNoteModal = ref(false)
const activeItem = ref<FollowupItem | null>(null)
const noteText = ref('')
const nextStatus = ref<FollowupStatus>('contacted')

// 按 filter 筛选
const filtered = computed(() =>
  followups.value.filter(f => f.status === activeFilter.value)
)

const pendingCount = computed(() => followups.value.filter(f => f.status === 'pending').length)
const contactedCount = computed(() => followups.value.filter(f => f.status === 'contacted').length)

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const threshold = await getWarningThreshold()
    await ensureFollowupsForWarningStudents(threshold)
    followups.value = await getPendingFollowups()
  } catch {
    followups.value = []
  } finally {
    loading.value = false
  }
}

// 课时颜色
function hoursClass(hours: number): string {
  const color = studentStore.getStudentColor(hours)
  if (color === 'danger') return 'text-red-500'
  if (color === 'warning') return 'text-amber-500'
  return 'text-green-600'
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
  <div class="p-4 space-y-3">
    <!-- 筛选 Tab -->
    <div class="flex bg-slate-100 rounded-xl p-1">
      <button
        :class="[
          'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5',
          activeFilter === 'pending'
            ? 'bg-white text-red-600 shadow-sm'
            : 'text-slate-500',
        ]"
        @click="activeFilter = 'pending'"
      >
        未联系
        <span
          v-if="pendingCount > 0"
          class="text-xs px-1.5 py-0.5 rounded-full"
          :class="activeFilter === 'pending' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'"
        >{{ pendingCount }}</span>
      </button>
      <button
        :class="[
          'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5',
          activeFilter === 'contacted'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500',
        ]"
        @click="activeFilter = 'contacted'"
      >
        已联系
        <span
          v-if="contactedCount > 0"
          class="text-xs px-1.5 py-0.5 rounded-full"
          :class="activeFilter === 'contacted' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'"
        >{{ contactedCount }}</span>
      </button>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- 空状态 -->
    <div v-else-if="filtered.length === 0" class="text-center py-16 text-slate-400">
      <p class="text-sm">
        {{ activeFilter === 'pending' ? '暂无需要跟进的学生' : '暂无已联系记录' }}
      </p>
      <p class="text-xs mt-1 text-slate-300">课时充足的学生不会出现在此列表</p>
    </div>

    <!-- 跟进列表 -->
    <div v-else class="space-y-3">
      <AppCard
        v-for="item in filtered"
        :key="item.id"
        class="!p-0 overflow-hidden"
      >
        <!-- 主内容区 -->
        <div
          class="flex items-center gap-3 p-4 cursor-pointer active:bg-slate-50"
          @click="goToDetail(item.student_id)"
        >
          <AppAvatar :name="item.student_name" />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-800 text-base">{{ item.student_name }}</span>
              <!-- 剩余课时（醒目显示，单独一个数字） -->
              <span class="text-lg font-bold tabular-nums" :class="hoursClass(item.remaining_hours)">
                {{ item.remaining_hours }}
              </span>
              <span class="text-xs text-slate-400">课时</span>
            </div>

            <!-- 备注（如有，放在第二行，字体更大更醒目） -->
            <p
              v-if="item.notes"
              class="text-sm text-slate-600 mt-0.5 leading-snug"
            >
              {{ item.notes }}
            </p>
            <p v-else class="text-xs text-slate-300 mt-0.5">暂无备注</p>
          </div>

          <ChevronRight class="w-4 h-4 text-slate-300 shrink-0" />
        </div>

        <!-- 操作栏 -->
        <div class="flex border-t border-slate-50" @click.stop>
          <!-- 未联系 → 标记已联系 -->
          <button
            v-if="item.status === 'pending'"
            class="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-indigo-600 active:bg-indigo-50"
            @click="openStatusModal(item, 'contacted')"
          >
            <Phone class="w-4 h-4" />
            标记已联系
          </button>

          <!-- 已联系 → 更新备注 -->
          <button
            v-if="item.status === 'contacted'"
            class="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-slate-600 active:bg-slate-50"
            @click="openStatusModal(item, 'contacted')"
          >
            <MessageSquare class="w-4 h-4" />
            更新备注
          </button>

          <!-- 管理员：续费 -->
          <button
            v-if="auth.isAdmin"
            class="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-green-600 border-l border-slate-50 active:bg-green-50"
            @click="goToPurchase(item.student_id)"
          >
            <ShoppingCart class="w-4 h-4" />
            续费
          </button>
        </div>
      </AppCard>
    </div>

    <!-- 备注 Modal -->
    <AppModal
      v-model:visible="showNoteModal"
      :title="activeItem?.status === 'pending' ? '标记已联系' : '更新跟进备注'"
    >
      <div class="space-y-4">
        <p v-if="activeItem" class="text-sm text-slate-600">
          学生：<span class="font-semibold text-slate-800">{{ activeItem.student_name }}</span>
          <span class="ml-2 font-bold" :class="hoursClass(activeItem.remaining_hours)">
            {{ activeItem.remaining_hours }}
          </span>
          <span class="text-xs text-slate-400 ml-1">课时剩余</span>
        </p>
        <AppInput
          v-model="noteText"
          label="跟进备注"
          placeholder="例如：家长说本周来续费，已确认"
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
</template>
