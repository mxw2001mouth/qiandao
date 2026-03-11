<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Shield, Bell, Database, FileText, ChevronRight } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { getWarningThreshold, setWarningThreshold } from '../db/repositories/settingsRepository'
import { updatePin } from '../db/repositories/userRepository'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'

const router = useRouter()
const auth = useAuthStore()

// 预警阈值
const threshold = ref('3')
const thresholdSaving = ref(false)

// PIN 修改
const showPinModal = ref(false)
const newPin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const pinSaving = ref(false)

onMounted(async () => {
  try {
    const val = await getWarningThreshold()
    threshold.value = String(val)
  } catch {
    // 默认值
  }
})

async function saveThreshold() {
  const val = Number(threshold.value)
  if (val <= 0 || isNaN(val)) return
  thresholdSaving.value = true
  try {
    await setWarningThreshold(val)
  } catch {
    // 错误处理
  } finally {
    thresholdSaving.value = false
  }
}

function openPinModal() {
  newPin.value = ''
  confirmPin.value = ''
  pinError.value = ''
  showPinModal.value = true
}

async function savePin() {
  if (newPin.value.length < 4) {
    pinError.value = 'PIN 码至少4位'
    return
  }
  if (newPin.value !== confirmPin.value) {
    pinError.value = '两次输入不一致'
    return
  }
  pinSaving.value = true
  try {
    await updatePin(auth.userId!, newPin.value)
    showPinModal.value = false
  } catch {
    pinError.value = '保存失败'
  } finally {
    pinSaving.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.replace('/login')
}

function goToExport() {
  router.push('/data/export')
}

function goToBackup() {
  router.push('/data/backup')
}
</script>

<template>
  <div class="min-h-screen bg-bg pb-20">
    <AppHeader title="设置" />
    <div class="p-4 space-y-4">
      <!-- 用户信息 -->
      <AppCard>
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center">
            <span class="text-white font-bold text-lg">{{ auth.userName?.slice(-1) }}</span>
          </div>
          <div>
            <div class="font-bold text-slate-800">{{ auth.userName }}</div>
            <div class="text-sm text-slate-400">{{ auth.isAdmin ? '管理员' : '老师' }}</div>
          </div>
        </div>
      </AppCard>

      <!-- 预警设置（管理员） -->
      <AppCard v-if="auth.isAdmin">
        <div class="flex items-center gap-2 mb-3">
          <Bell class="w-4 h-4 text-indigo-500" />
          <h3 class="font-bold text-slate-800">课时预警</h3>
        </div>
        <div class="flex items-end gap-3">
          <AppInput
            v-model="threshold"
            label="预警阈值（课时）"
            type="number"
            placeholder="3"
            class="flex-1"
          />
          <AppButton size="sm" :loading="thresholdSaving" @click="saveThreshold">
            保存
          </AppButton>
        </div>
        <p class="text-xs text-slate-400 mt-2">当学生剩余课时 &le; 此值时显示黄色预警</p>
      </AppCard>

      <!-- 账号安全 -->
      <AppCard>
        <div class="flex items-center gap-2 mb-3">
          <Shield class="w-4 h-4 text-indigo-500" />
          <h3 class="font-bold text-slate-800">账号安全</h3>
        </div>
        <button
          class="w-full flex items-center justify-between py-3 border-b border-slate-50"
          @click="openPinModal"
        >
          <span class="text-sm text-slate-700">修改 PIN 码</span>
          <ChevronRight class="w-4 h-4 text-slate-400" />
        </button>
      </AppCard>

      <!-- 数据管理（管理员） -->
      <AppCard v-if="auth.isAdmin">
        <div class="flex items-center gap-2 mb-3">
          <Database class="w-4 h-4 text-indigo-500" />
          <h3 class="font-bold text-slate-800">数据管理</h3>
        </div>
        <button
          class="w-full flex items-center justify-between py-3 border-b border-slate-50"
          @click="goToExport"
        >
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-slate-500" />
            <span class="text-sm text-slate-700">导出数据</span>
          </div>
          <ChevronRight class="w-4 h-4 text-slate-400" />
        </button>
        <button
          class="w-full flex items-center justify-between py-3"
          @click="goToBackup"
        >
          <div class="flex items-center gap-2">
            <Database class="w-4 h-4 text-slate-500" />
            <span class="text-sm text-slate-700">备份与还原</span>
          </div>
          <ChevronRight class="w-4 h-4 text-slate-400" />
        </button>
      </AppCard>

      <!-- 关于 -->
      <AppCard>
        <div class="text-center text-xs text-slate-400 space-y-1">
          <p>签到管理系统 v1.0</p>
          <p>培训机构学生签到与课时管理</p>
        </div>
      </AppCard>

      <!-- 退出登录 -->
      <AppButton variant="secondary" class="w-full" @click="handleLogout">
        <LogOut class="w-4 h-4 mr-2" />
        退出登录
      </AppButton>

      <!-- PIN 修改弹窗 -->
      <AppModal v-model:visible="showPinModal" title="修改 PIN 码">
        <div class="space-y-4">
          <AppInput
            v-model="newPin"
            label="新 PIN 码"
            placeholder="至少4位数字"
            type="password"
          />
          <AppInput
            v-model="confirmPin"
            label="确认 PIN 码"
            placeholder="再次输入"
            type="password"
            :error="pinError"
          />
          <div class="flex gap-3">
            <AppButton variant="secondary" size="sm" class="flex-1" @click="showPinModal = false">
              取消
            </AppButton>
            <AppButton size="sm" class="flex-1" :loading="pinSaving" @click="savePin">
              确认修改
            </AppButton>
          </div>
        </div>
      </AppModal>
    </div>
    <BottomNav />
  </div>
</template>
