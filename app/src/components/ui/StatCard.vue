<script setup lang="ts">
interface Props {
  value: string | number
  label: string
  gradient?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gradient: false,
})
</script>

<template>
  <div
    :class="[
      'rounded-2xl py-3 px-2 text-center',
      props.gradient
        ? 'bg-gradient-to-br from-indigo-500 to-indigo-400 shadow-md shadow-indigo-100'
        : 'bg-white shadow-sm',
    ]"
  >
    <div
      :class="[
        'text-2xl font-bold leading-tight',
        props.gradient ? 'text-white' : 'text-slate-800',
      ]"
    >
      {{ props.value }}
    </div>
    <div
      :class="[
        'text-xs mt-1',
        props.gradient ? 'text-white/80' : 'text-slate-500',
      ]"
    >
      {{ props.label }}
    </div>
  </div>
</template>
