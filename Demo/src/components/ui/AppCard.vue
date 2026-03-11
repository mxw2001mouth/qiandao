<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>

<template>
  <div
    :class="[
      'bg-white rounded-2xl shadow-sm p-4 transition-shadow duration-200 hover:shadow-md',
      $props.class,
    ]"
  >
    <slot />
  </div>
</template>
