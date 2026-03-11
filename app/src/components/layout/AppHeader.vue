<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

interface Props {
  title?: string
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
})

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
    <!-- 状态栏安全区域占位 -->
    <div :style="{ height: 'var(--safe-top)' }" />
    <!-- 标题栏内容区 -->
    <div class="h-14 flex items-center px-4">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <button
          v-if="props.showBack"
          class="w-8 h-8 flex items-center justify-center rounded-lg active:bg-slate-100 -ml-1 shrink-0"
          @click="goBack"
        >
          <ChevronLeft class="w-5 h-5 text-slate-600" />
        </button>
        <h1 class="text-lg font-bold text-slate-800 truncate">
          {{ props.title }}
        </h1>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
