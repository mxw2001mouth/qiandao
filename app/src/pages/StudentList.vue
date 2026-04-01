<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Phone } from 'lucide-vue-next'
import { useStudentStore } from '../stores/student'
import { useAuthStore } from '../stores/auth'
import { updateAllLifecycleTags } from '../utils/lifecycle'
import type { LifecycleTag } from '../types'
import AppInput from '../components/ui/AppInput.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'

const router = useRouter()
const studentStore = useStudentStore()
const auth = useAuthStore()

const searchQuery = ref('')
const activeTab = ref<'active' | 'archived'>('active')

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

onMounted(async () => {
  await studentStore.fetchStudents()
  await updateAllLifecycleTags()
  await studentStore.fetchStudents()
})

// 当前 tab 对应的学生列表
const filteredStudents = computed(() => {
  const list = activeTab.value === 'active'
    ? studentStore.activeStudents
    : studentStore.archivedStudents

  if (!searchQuery.value.trim()) return list

  const q = searchQuery.value.trim().toLowerCase()
  return list.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.class_name.toLowerCase().includes(q) ||
    s.parent_phone.includes(q)
  )
})

function goToDetail(id: number) {
  router.push(`/students/${id}`)
}

function goToAdd() {
  router.push('/students/add')
}

function hoursTextClass(hours: number): string {
  const color = studentStore.getStudentColor(hours)
  if (color === 'danger') return 'text-red-500'
  if (color === 'warning') return 'text-amber-500'
  return 'text-emerald-500'
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 搜索栏 -->
    <AppInput
      v-model="searchQuery"
      placeholder="搜索学生姓名、班级、手机号"
    >
      <template #prefix>
        <Search class="w-4 h-4" />
      </template>
    </AppInput>

    <!-- Tab 切换 -->
    <div class="flex bg-slate-100 rounded-xl p-1">
      <button
        :class="[
          'flex-1 h-11 text-sm font-medium rounded-xl transition-all duration-200',
          activeTab === 'active'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500',
        ]"
        @click="activeTab = 'active'"
      >
        在读
      </button>
      <button
        :class="[
          'flex-1 h-11 text-sm font-medium rounded-xl transition-all duration-200',
          activeTab === 'archived'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500',
        ]"
        @click="activeTab = 'archived'"
      >
        已退课
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="studentStore.isLoading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="filteredStudents.length === 0"
      class="text-center py-20 text-slate-400"
    >
      <p class="text-sm">{{ searchQuery ? '没有找到匹配的学生' : '暂无学生数据' }}</p>
    </div>

    <!-- 学生列表 -->
    <div v-else class="space-y-3">
      <AppCard
        v-for="student in filteredStudents"
        :key="student.id"
        class="!p-3 active:scale-[0.985] active:shadow-sm transition-all duration-150 cursor-pointer"
        @click="goToDetail(student.id)"
      >
        <div class="flex items-center gap-3.5">
          <!-- 头像 -->
          <AppAvatar :name="student.name" size="md" />

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-semibold text-slate-800 truncate">{{ student.name }}</span>
              <AppBadge
                class="shrink-0"
                :label="lifecycleLabels[student.lifecycle_tag]"
                :variant="lifecycleVariants[student.lifecycle_tag]"
              />
            </div>
            <div class="flex items-center gap-1.5 mt-1 min-w-0">
              <span class="text-xs text-slate-400 truncate">家长：{{ student.parent_name }}</span>
              <a
                :href="`tel:${student.parent_phone}`"
                class="text-xs text-slate-400 truncate hover:text-indigo-500"
                @click.stop
              >
                {{ student.parent_phone }}
              </a>
              <a
                :href="`tel:${student.parent_phone}`"
                class="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95 active:bg-slate-200 shrink-0"
                aria-label="拨打家长电话"
                @click.stop
              >
                <Phone class="w-3 h-3" />
              </a>
            </div>
          </div>

          <!-- 剩余课时大字 -->
          <div v-if="activeTab === 'active'" class="shrink-0">
            <div class="min-w-[3.8rem] rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-center">
              <div
                :class="[
                  'text-2xl font-extrabold leading-none tabular-nums',
                  hoursTextClass(student.remaining_hours),
                ]"
              >
                {{ student.remaining_hours }}
              </div>
              <div class="mt-1 text-xs leading-none tracking-wide text-slate-400">课时</div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- FAB 添加按钮（仅管理员） -->
    <button
      v-if="auth.isAdmin"
      class="fixed right-5 bottom-24 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-90 transition-transform z-30"
      @click="goToAdd"
    >
      <Plus class="w-6 h-6" />
    </button>
  </div>
</template>
