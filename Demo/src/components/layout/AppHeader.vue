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
  <header class="h-14 flex items-center px-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
    <!-- 左侧：返回按钮或标题 -->
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <button
        v-if="props.showBack"
        class="w-8 h-8 flex items-center justify-center rounded-lg active:bg-slate-100 -ml-1"
        @click="goBack"
      >
        <ChevronLeft class="w-5 h-5 text-slate-600" />
      </button>
      <h1 class="text-lg font-bold text-slate-800 truncate">
        {{ props.title }}
      </h1>
    </div>
    <!-- 右侧：action 插槽 -->
    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
