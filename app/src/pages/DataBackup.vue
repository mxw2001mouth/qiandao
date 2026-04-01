<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, Upload, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import {
  backupDatabase,
  restoreDatabase,
  getDaysSinceBackup,
  listBackups,
} from '../utils/backup'

const daysSinceBackup = ref<number | null>(null)
const backups = ref<string[]>([])
const isBackingUp = ref(false)
const isRestoring = ref(false)
const showRestoreConfirm = ref(false)
const selectedBackup = ref('')
const showResultModal = ref(false)
const resultMessage = ref('')
const resultIsError = ref(false)

async function loadState() {
  daysSinceBackup.value = await getDaysSinceBackup()
  backups.value = await listBackups()
}

onMounted(loadState)

async function handleBackup() {
  isBackingUp.value = true
  resultIsError.value = false
  try {
    const path = await backupDatabase()
    resultMessage.value = `备份成功！文件保存至：${path}`
    showResultModal.value = true
    await loadState()
  } catch (e) {
    resultMessage.value = `备份失败：${e instanceof Error ? e.message : '未知错误'}`
    resultIsError.value = true
    showResultModal.value = true
  } finally {
    isBackingUp.value = false
  }
}

function confirmRestore(path: string) {
  selectedBackup.value = path
  showRestoreConfirm.value = true
}

async function handleRestore() {
  showRestoreConfirm.value = false
  isRestoring.value = true
  resultIsError.value = false
  try {
    await restoreDatabase(selectedBackup.value)
    resultMessage.value = '数据已成功还原，请重新登录。'
    showResultModal.value = true
  } catch (e) {
    resultMessage.value = `还原失败：${e instanceof Error ? e.message : '未知错误'}`
    resultIsError.value = true
    showResultModal.value = true
  } finally {
    isRestoring.value = false
  }
}

// 从文件名提取可读时间
function formatBackupName(path: string): string {
  const match = path.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/)
  if (!match) return path
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`
}
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="数据备份" :show-back="true" />

    <div class="px-4 pt-4 space-y-4">
      <!-- 备份状态 -->
      <AppCard>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
               :class="daysSinceBackup === null || daysSinceBackup > 7 ? 'bg-red-50' : 'bg-green-50'">
            <Database class="w-5 h-5"
                      :class="daysSinceBackup === null || daysSinceBackup > 7 ? 'text-red-500' : 'text-green-500'" />
          </div>
          <div>
            <p class="font-medium text-slate-800">
              {{ daysSinceBackup === null ? '尚未备份' : `距上次备份 ${daysSinceBackup} 天` }}
            </p>
            <p class="text-xs text-slate-500">建议每周备份一次</p>
          </div>
        </div>
      </AppCard>

      <!-- 一键备份 -->
      <AppButton
        class="w-full"
        size="lg"
        :loading="isBackingUp"
        @click="handleBackup"
      >
        <Database class="w-5 h-5 mr-2" />
        立即备份
      </AppButton>

      <!-- 备份历史 -->
      <div v-if="backups.length > 0">
        <h3 class="text-sm font-medium text-slate-700 mb-2 px-1">备份历史</h3>
        <div class="space-y-2">
          <AppCard v-for="backup in backups" :key="backup">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-slate-700">{{ formatBackupName(backup) }}</p>
                <p class="text-xs text-slate-400">{{ backup }}</p>
              </div>
              <button
                class="h-11 px-4 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-medium active:bg-indigo-100 inline-flex items-center"
                :disabled="isRestoring"
                @click="confirmRestore(backup)"
              >
                <Upload class="w-4 h-4 inline mr-1" />
                还原
              </button>
            </div>
          </AppCard>
        </div>
      </div>
      <div v-else class="text-center py-6 text-slate-400 text-sm">
        暂无备份记录
      </div>
    </div>

    <!-- 还原确认弹窗 -->
    <AppModal v-model:visible="showRestoreConfirm" title="确认还原">
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-orange-500">
          <AlertTriangle class="w-5 h-5" />
          <p class="font-medium">还原将覆盖当前所有数据</p>
        </div>
        <p class="text-sm text-slate-600">确定要从以下备份还原吗？此操作不可撤销。</p>
        <div class="bg-slate-50 rounded-xl p-3">
          <p class="text-sm text-slate-700">{{ formatBackupName(selectedBackup) }}</p>
        </div>
        <div class="flex gap-3 pt-2">
          <AppButton variant="secondary" class="flex-1" @click="showRestoreConfirm = false">
            取消
          </AppButton>
          <AppButton variant="danger" class="flex-1" :loading="isRestoring" @click="handleRestore">
            确认还原
          </AppButton>
        </div>
      </div>
    </AppModal>

    <!-- 结果弹窗 -->
    <AppModal v-model:visible="showResultModal" :title="resultIsError ? '操作失败' : '操作成功'">
      <div class="space-y-3">
        <div class="flex items-center gap-3" :class="resultIsError ? 'text-red-500' : 'text-green-600'">
          <component :is="resultIsError ? AlertTriangle : CheckCircle" class="w-8 h-8" />
          <p class="font-medium text-sm">{{ resultMessage }}</p>
        </div>
        <AppButton class="w-full" @click="showResultModal = false">
          确定
        </AppButton>
      </div>
    </AppModal>

    <BottomNav />
  </div>
</template>
