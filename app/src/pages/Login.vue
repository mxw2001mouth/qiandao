<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarCheck, Delete } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const pin = ref('')
const maxLength = 4
const error = ref(false)
const shaking = ref(false)

// 数字键盘布局
const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
]

function onKeyPress(key: string) {
  if (key === 'del') {
    pin.value = pin.value.slice(0, -1)
    error.value = false
    return
  }
  if (key === '' || pin.value.length >= maxLength) return

  pin.value += key
  error.value = false

  // 输入满自动提交
  if (pin.value.length === maxLength) {
    submitPin()
  }
}

async function submitPin() {
  try {
    const success = await auth.login(pin.value)
    if (success) {
      router.replace('/attendance/today')
    } else {
      error.value = true
      shaking.value = true
      setTimeout(() => {
        shaking.value = false
        pin.value = ''
      }, 500)
    }
  } catch (e) {
    console.error('登录失败:', e)
    error.value = true
    shaking.value = true
    setTimeout(() => {
      shaking.value = false
      pin.value = ''
    }, 500)
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center bg-slate-50 px-6" :style="{ paddingTop: 'calc(4rem + var(--safe-top))' }">
    <!-- App 图标 -->
    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
      <CalendarCheck class="w-10 h-10 text-white" />
    </div>

    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-slate-800">签到管理</h1>
    <p class="text-slate-400 text-sm mt-1 mb-10">请输入 PIN 码登录</p>

    <!-- PIN 显示区 -->
    <div
      :class="['flex gap-3 mb-3 transition-all', shaking && 'animate-shake']"
    >
      <div
        v-for="i in maxLength"
        :key="i"
        :class="[
          'w-4 h-4 rounded-full transition-all duration-200',
          i <= pin.length
            ? (error ? 'bg-red-500 scale-110' : 'bg-indigo-500 scale-110')
            : 'border-2 border-slate-300',
        ]"
      />
    </div>

    <!-- 错误提示 -->
    <p v-if="error" class="text-red-500 text-sm mb-4">PIN 码错误，请重试</p>
    <div v-else class="h-5 mb-4" />

    <!-- 数字键盘 -->
    <div class="w-full max-w-xs">
      <div v-for="(row, ri) in keys" :key="ri" class="flex justify-center gap-5 mb-4">
        <button
          v-for="key in row"
          :key="key"
          :class="[
            'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-150',
            key === ''
              ? 'invisible'
              : key === 'del'
                ? 'bg-transparent active:bg-slate-100'
                : 'bg-slate-100 active:bg-slate-200 active:scale-95 text-xl font-bold text-slate-700',
          ]"
          @click="onKeyPress(key)"
        >
          <Delete v-if="key === 'del'" class="w-6 h-6 text-slate-500" />
          <span v-else>{{ key }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
