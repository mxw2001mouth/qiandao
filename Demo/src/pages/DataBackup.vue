<script setup lang="ts">
import { ref } from 'vue'
import { Database, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import AppHeader from '../components/layout/AppHeader.vue'
import BottomNav from '../components/layout/BottomNav.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import { localStore } from '../db/localStore'

const isBackingUp = ref(false)
const isRestoring = ref(false)
const showResultModal = ref(false)
const resultMessage = ref('')
const resultIsError = ref(false)
const fileInput = ref<HTMLInputElement>()

async function handleBackup() {
  isBackingUp.value = true
  resultIsError.value = false
  try {
    const data = localStore.exportAll()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qiandao_backup_${new Date().toISOString().substring(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    resultMessage.value = '备份文件已下载到本地'
    showResultModal.value = true
  } catch (e) {
    resultMessage.value = `备份失败：${e instanceof Error ? e.message : '未知错误'}`
    resultIsError.value = true
    showResultModal.value = true
  } finally {
    isBackingUp.value = false
  }
}

function triggerRestore() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isRestoring.value = true
  resultIsError.value = false
  try {
    const text = await file.text()
    const data = JSON.parse(text) as Record<string, unknown[]>
    localStore.importAll(data)
    resultMessage.value = '数据还原成功！请刷新页面查看数据。'
    showResultModal.value = true
  } catch (e) {
    resultMessage.value = `还原失败：文件格式错误或 ${e instanceof Error ? e.message : '未知错误'}`
    resultIsError.value = true
    showResultModal.value = true
  } finally {
    isRestoring.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg pb-24">
    <AppHeader title="数据备份" :show-back="true" />

    <div class="px-4 pt-4 space-y-4">
      <!-- 说明卡片 -->
      <AppCard>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Database class="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p class="font-medium text-slate-800">数据备份与还原</p>
            <p class="text-xs text-slate-500">将数据导出为 JSON 文件，可随时还原</p>
          </div>
        </div>
      </AppCard>

      <!-- 备份按钮 -->
      <AppButton class="w-full" size="lg" :loading="isBackingUp" @click="handleBackup">
        <Download class="w-5 h-5 mr-2" />
        下载备份文件
      </AppButton>

      <!-- 还原按钮 -->
      <AppButton
        variant="secondary"
        class="w-full"
        size="lg"
        :loading="isRestoring"
        @click="triggerRestore"
      >
        <Upload class="w-5 h-5 mr-2" />
        从文件还原
      </AppButton>

      <!-- 隐藏文件输入 -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="onFileChange"
      />

      <!-- 提示 -->
      <AppCard>
        <div class="flex items-start gap-2 text-amber-600">
          <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
          <p class="text-xs">还原操作会覆盖当前所有数据，请谨慎操作。还原后请刷新页面。</p>
        </div>
      </AppCard>
    </div>

    <!-- 结果弹窗 -->
    <AppModal
      v-model:visible="showResultModal"
      :title="resultIsError ? '操作失败' : '操作成功'"
    >
      <div class="space-y-3">
        <div
          class="flex items-center gap-3"
          :class="resultIsError ? 'text-red-500' : 'text-green-600'"
        >
          <component :is="resultIsError ? AlertTriangle : CheckCircle" class="w-8 h-8" />
          <p class="font-medium text-sm">{{ resultMessage }}</p>
        </div>
        <AppButton class="w-full" @click="showResultModal = false">确定</AppButton>
      </div>
    </AppModal>

    <BottomNav />
  </div>
</template>
