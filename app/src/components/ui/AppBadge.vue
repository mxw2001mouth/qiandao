<script setup lang="ts">
interface Props {
  variant?: 'success' | 'warning' | 'danger' | 'info'
  label: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
})

const variantClasses: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-indigo-100 text-indigo-700',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      variantClasses[props.variant],
    ]"
  >
    {{ props.label }}
  </span>
</template>
