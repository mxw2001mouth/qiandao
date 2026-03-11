<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

// 暖色调背景色池
const warmColors = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#6366F1', '#3B82F6', '#14B8A6', '#22C55E',
  '#F59E0B', '#E11D48', '#7C3AED', '#0EA5E9',
]

// 根据姓名 hash 选择颜色
const bgColor = computed(() => {
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return warmColors[Math.abs(hash) % warmColors.length]
})

// 取姓名最后一个字作为头像文字（中文习惯）
const initial = computed(() => {
  return props.name ? props.name.slice(-1) : '?'
})

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
}
</script>

<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center text-white font-bold shrink-0',
      sizeClasses[props.size],
    ]"
    :style="{ backgroundColor: bgColor }"
  >
    {{ initial }}
  </div>
</template>
