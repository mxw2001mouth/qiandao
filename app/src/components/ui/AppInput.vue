<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  type?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="props.label" class="block text-sm font-medium text-slate-700 mb-1.5">
      {{ props.label }}
    </label>
    <div class="relative">
      <!-- 左侧图标插槽 -->
      <div v-if="$slots.prefix" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <slot name="prefix" />
      </div>
      <input
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :class="[
          'w-full h-11 border rounded-xl px-4 text-sm text-slate-800 bg-white transition-all duration-200',
          'focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
          'placeholder:text-slate-300',
          props.error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200',
          props.disabled && 'bg-slate-50 text-slate-400',
          $slots.prefix && 'pl-10',
        ]"
        @input="onInput"
      />
    </div>
    <p v-if="props.error" class="mt-1 text-xs text-red-500">{{ props.error }}</p>
  </div>
</template>
