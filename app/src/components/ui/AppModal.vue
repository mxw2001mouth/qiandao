<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  visible: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

function close() {
  emit('update:visible', false)
}

// 控制 body 滚动
watch(() => props.visible, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="props.visible" class="fixed inset-0 z-50 flex items-end justify-center">
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/40 transition-opacity"
          @click="close"
        />
        <!-- 底部 Sheet -->
        <div class="relative w-full max-w-lg bg-white rounded-t-3xl shadow-xl animate-slide-up max-h-[85vh] flex flex-col">
          <!-- 拖拽指示条 -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-10 h-1 bg-slate-300 rounded-full" />
          </div>
          <!-- 标题 -->
          <div v-if="props.title" class="px-5 pb-3">
            <h3 class="text-lg font-bold text-slate-800">{{ props.title }}</h3>
          </div>
          <!-- 内容（pb 含底部安全区，防手势导航栏遮挡） -->
          <div class="px-5 overflow-y-auto flex-1" style="padding-bottom: max(24px, env(safe-area-inset-bottom))">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.modal-enter-active {
  transition: opacity 0.3s ease;
}
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
