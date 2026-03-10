<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  value: string | number
  label: string
  icon?: Component
  gradient?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gradient: false,
})
</script>

<template>
  <div
    :class="[
      'rounded-2xl p-4 flex items-center gap-3',
      props.gradient
        ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-md'
        : 'bg-white shadow-sm',
    ]"
  >
    <div
      v-if="props.icon"
      :class="[
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        props.gradient ? 'bg-white/20' : 'bg-indigo-50',
      ]"
    >
      <component
        :is="props.icon"
        :class="[
          'w-5 h-5',
          props.gradient ? 'text-white' : 'text-indigo-500',
        ]"
      />
    </div>
    <div class="min-w-0">
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
          'text-sm mt-0.5',
          props.gradient ? 'text-white/80' : 'text-slate-500',
        ]"
      >
        {{ props.label }}
      </div>
    </div>
  </div>
</template>
