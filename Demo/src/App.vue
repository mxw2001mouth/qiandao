<script setup lang="ts">
import { watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { updateAllLifecycleTags } from './utils/lifecycle'

const auth = useAuthStore()

watch(
  () => auth.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      try {
        await updateAllLifecycleTags()
      } catch {
        // ignore
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <RouterView />
  </div>
</template>
