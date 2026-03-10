<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Student, Purchase } from '../types'
import { getStudentById } from '../db/repositories/studentRepository'
import { addHours } from '../db/repositories/studentRepository'
import { createPurchase, getPurchasesByStudent } from '../db/repositories/purchaseRepository'
import { upsertFollowup } from '../db/repositories/followupRepository'
import { updateAllLifecycleTags } from '../utils/lifecycle'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppAvatar from '../components/ui/AppAvatar.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'
import { useStudentStore } from '../stores/student'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()

const studentId = Number(route.params.id)
const student = ref<Student | null>(null)
const purchases = ref<Purchase[]>([])
const loading = ref(true)
const submitting = ref(false)

const form = ref({
  date: dayjs().format('YYYY-MM-DD'),
  hours: '',
  amount: '',
  notes: '',
})

const errors = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    student.value = await getStudentById(studentId)
    purchases.value = await getPurchasesByStudent(studentId)
  } catch {
    // DB 错误
  } finally {
    loading.value = false
  }
})

function validate(): boolean {
  errors.value = {}
  if (!form.value.date) errors.value.date = '请选择日期'
  if (!form.value.hours || Number(form.value.hours) <= 0) errors.value.hours = '请输入课时数'
  if (!form.value.amount || Number(form.value.amount) <= 0) errors.value.amount = '请输入金额'
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  try {
    const hours = Number(form.value.hours)
    // 创建续费记录
    await createPurchase({
      student_id: studentId,
      date: form.value.date,
      hours,
      amount: Number(form.value.amount),
      notes: form.value.notes,
    })
    // 增加课时
    await addHours(studentId, hours)
    // 标记跟进为已续费
    await upsertFollowup(studentId, 'renewed', `续费 ${hours} 课时`)
    // 更新生命周期标签（续费后恢复状态）
    await updateAllLifecycleTags()
    // 刷新学生列表
    await studentStore.fetchStudents()
    router.back()
  } catch {
    // 错误处理
  } finally {
    submitting.value = false
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
      <!-- 学生信息卡片 -->
      <AppCard>
        <div class="flex items-center gap-3">
          <AppAvatar :name="student.name" />
          <div class="flex-1">
            <div class="font-bold text-slate-800">{{ student.name }}</div>
            <div class="flex items-center gap-2 mt-1">
              <AppBadge :label="student.class_name" variant="info" />
              <AppBadge
                :label="`剩余 ${student.remaining_hours} 课时`"
                :variant="studentStore.getStudentColor(student.remaining_hours)"
              />
            </div>
          </div>
        </div>
      </AppCard>

      <!-- 续费表单 -->
      <AppCard>
        <h3 class="font-bold text-slate-800 mb-4">续费信息</h3>
        <div class="space-y-4">
          <AppInput
            v-model="form.date"
            label="续费日期"
            type="date"
            :error="errors.date"
          />
          <AppInput
            v-model="form.hours"
            label="续费课时数"
            placeholder="请输入课时数"
            type="number"
            :error="errors.hours"
          />
          <AppInput
            v-model="form.amount"
            label="缴费金额（元）"
            placeholder="请输入金额"
            type="number"
            :error="errors.amount"
          />
          <AppInput
            v-model="form.notes"
            label="备注"
            placeholder="选填"
          />
        </div>
      </AppCard>

      <AppButton class="w-full" :loading="submitting" @click="handleSubmit">
        确认续费
      </AppButton>

      <!-- 购课/续费历史 -->
      <AppCard v-if="purchases.length > 0">
        <h3 class="font-bold text-slate-800 mb-3">购课历史</h3>
        <div class="space-y-3">
          <div
            v-for="p in purchases"
            :key="p.id"
            class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
          >
            <div>
              <div class="text-sm text-slate-700 font-medium">{{ p.hours }} 课时</div>
              <div class="text-xs text-slate-400">{{ p.date }}</div>
              <div v-if="p.notes" class="text-xs text-slate-400">{{ p.notes }}</div>
            </div>
            <div class="text-sm font-bold text-slate-700">
              ¥{{ p.amount }}
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
