<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
})

const variantClasses: Record<string, string> = {
  primary: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm active:scale-95',
  secondary: 'border border-indigo-200 text-indigo-600 bg-white active:bg-indigo-50',
  danger: 'bg-red-500 text-white active:scale-95',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-3.5 text-lg rounded-xl',
}
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      variantClasses[props.variant],
      sizeClasses[props.size],
      (props.loading || props.disabled) && 'opacity-60 pointer-events-none',
    ]"
    :disabled="props.loading || props.disabled"
  >
    <LoadingSpinner v-if="props.loading" class="w-5 h-5 mr-2" />
    <slot />
  </button>
</template>
