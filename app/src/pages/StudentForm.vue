<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudentStore } from '../stores/student'
import { getStudentById } from '../db/repositories/studentRepository'
import { createPurchase } from '../db/repositories/purchaseRepository'
import { getClassCatalog } from '../db/repositories/settingsRepository'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'
import LoadingSpinner from '../components/ui/LoadingSpinner.vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()

const isEdit = computed(() => route.name === 'StudentEdit')
const studentId = computed(() => Number(route.params.id))

const form = ref({
  name: '',
  class_name: '',
  parent_name: '',
  parent_phone: '',
  purchase_date: dayjs().format('YYYY-MM-DD'),
  initial_hours: '',
  initial_amount: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)
const submitting = ref(false)
const classOptions = ref<string[]>([])

function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function includeClassOptionIfMissing(className: string) {
  const normalized = className.trim()
  if (!normalized) return
  if (classOptions.value.includes(normalized)) return
  classOptions.value = sortClasses([...classOptions.value, normalized])
}

onMounted(async () => {
  try {
    classOptions.value = await getClassCatalog()
  } catch {
    classOptions.value = []
  }

  if (isEdit.value) {
    loading.value = true
    try {
      const student = await getStudentById(studentId.value)
      if (student) {
        includeClassOptionIfMissing(student.class_name)
        form.value.name = student.name
        form.value.class_name = student.class_name
        form.value.parent_name = student.parent_name
        form.value.parent_phone = student.parent_phone
      }
    } catch {
      // DB 错误
    } finally {
      loading.value = false
    }
  } else if (classOptions.value.length > 0) {
    form.value.class_name = classOptions.value[0]!
  }
})

function validate(): boolean {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = '请输入学生姓名'
  }
  if (!form.value.class_name.trim()) {
    errors.value.class_name = '请选择班级'
  }
  if (!form.value.parent_name.trim()) {
    errors.value.parent_name = '请输入家长姓名'
  }
  if (!form.value.parent_phone.trim()) {
    errors.value.parent_phone = '请输入手机号'
  } else if (!/^1\d{10}$/.test(form.value.parent_phone.trim())) {
    errors.value.parent_phone = '请输入正确的手机号'
  }

  if (!isEdit.value) {
    if (!form.value.initial_hours || Number(form.value.initial_hours) <= 0) {
      errors.value.initial_hours = '请输入课时数量'
    }
    if (!form.value.initial_amount || Number(form.value.initial_amount) <= 0) {
      errors.value.initial_amount = '请输入缴费金额'
    }
    if (!form.value.purchase_date) {
      errors.value.purchase_date = '请选择购课日期'
    }
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await studentStore.updateStudent(studentId.value, {
        name: form.value.name.trim(),
        class_name: form.value.class_name.trim(),
        parent_name: form.value.parent_name.trim(),
        parent_phone: form.value.parent_phone.trim(),
      })
    } else {
      const hours = Number(form.value.initial_hours)
      const newId = await studentStore.addStudent({
        name: form.value.name.trim(),
        class_name: form.value.class_name.trim(),
        parent_name: form.value.parent_name.trim(),
        parent_phone: form.value.parent_phone.trim(),
        remaining_hours: hours,
        total_hours: hours,
      })
      // 创建首次购课记录
      await createPurchase({
        student_id: newId,
        date: form.value.purchase_date,
        hours,
        amount: Number(form.value.initial_amount),
        notes: '首次购课',
      })
    }
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

    <div v-else class="space-y-4">
      <AppCard>
        <div class="space-y-4">
          <AppInput
            v-model="form.name"
            label="学生姓名"
            placeholder="请输入姓名"
            :error="errors.name"
          />
          <div class="w-full">
            <label class="block text-sm font-medium text-slate-700 mb-1.5">班级</label>
            <select
              v-model="form.class_name"
              class="w-full h-11 border rounded-xl px-4 text-sm text-slate-800 bg-white transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              :class="errors.class_name ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'"
            >
              <option v-if="classOptions.length === 0" value="">暂无可选班级</option>
              <option v-for="className in classOptions" :key="className" :value="className">
                {{ className }}
              </option>
            </select>
            <p v-if="classOptions.length === 0" class="mt-1 text-xs text-amber-600">
              请先在设置页的班级管理中新增班级
            </p>
            <p v-if="errors.class_name" class="mt-1 text-xs text-red-500">{{ errors.class_name }}</p>
          </div>
          <AppInput
            v-model="form.parent_name"
            label="家长姓名"
            placeholder="请输入家长姓名"
            :error="errors.parent_name"
          />
          <AppInput
            v-model="form.parent_phone"
            label="家长手机号"
            placeholder="请输入手机号"
            type="tel"
            :error="errors.parent_phone"
          />
        </div>
      </AppCard>

      <!-- 首次购课信息（仅新增） -->
      <AppCard v-if="!isEdit">
        <h3 class="font-bold text-slate-800 mb-4">首次购课</h3>
        <div class="space-y-4">
          <AppInput
            v-model="form.purchase_date"
            label="购课日期"
            type="date"
            :error="errors.purchase_date"
          />
          <AppInput
            v-model="form.initial_hours"
            label="课时数量"
            placeholder="请输入课时数"
            type="number"
            :error="errors.initial_hours"
          />
          <AppInput
            v-model="form.initial_amount"
            label="缴费金额（元）"
            placeholder="请输入金额"
            type="number"
            :error="errors.initial_amount"
          />
        </div>
      </AppCard>

      <AppButton
        class="w-full"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ isEdit ? '保存修改' : '确认添加' }}
      </AppButton>
    </div>
  </div>
</template>
