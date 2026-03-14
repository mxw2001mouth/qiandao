<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  src: string | null
  title?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 触摸状态
let pinchStartDist = 0
let pinchStartScale = 1
let lastTapTime = 0

watch(() => props.visible, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
  if (!val) resetTransform()
})

function resetTransform() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function close() {
  emit('update:visible', false)
}

function getTouchDist(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
    pinchStartDist = getTouchDist(e.touches)
    pinchStartScale = scale.value
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
    const dist = getTouchDist(e.touches)
    const ratio = dist / pinchStartDist
    scale.value = Math.min(4, Math.max(1, pinchStartScale * ratio))
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0 && e.changedTouches.length === 1) {
    // 双击检测
    const now = Date.now()
    if (now - lastTapTime < 280) {
      scale.value > 1 ? resetTransform() : (scale.value = 2.5)
    }
    lastTapTime = now
  }
  // 缩到接近1x时自动吸附回1
  if (scale.value < 1.15) resetTransform()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="photo-viewer">
      <div
        v-if="visible && src"
        class="fixed inset-0 z-[60] bg-black flex flex-col"
        @click.self="close"
      >
        <!-- 顶栏 -->
        <div class="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <span class="text-white/80 text-sm font-medium">{{ title || '照片' }}</span>
          <button
            class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
            @click="close"
          >
            <X class="w-5 h-5 text-white" />
          </button>
        </div>

        <!-- 图片区域：touch-action:none 阻止浏览器原生缩放/滚动干扰 -->
        <div
          class="flex-1 overflow-hidden flex items-center justify-center"
          style="touch-action: none"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <img
            :src="src"
            :style="{
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              transition: 'transform 0.15s ease',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              touchAction: 'none',
            }"
            draggable="false"
            alt="照片"
          />
        </div>

        <!-- 底部提示 -->
        <div class="py-3 text-center flex-shrink-0">
          <p class="text-white/40 text-xs">双指捏合缩放 · 双击还原</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.photo-viewer-enter-active {
  transition: opacity 0.2s ease;
}
.photo-viewer-leave-active {
  transition: opacity 0.15s ease;
}
.photo-viewer-enter-from,
.photo-viewer-leave-to {
  opacity: 0;
}
</style>
