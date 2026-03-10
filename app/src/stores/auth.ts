import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from '../types'
import { verifyPin } from '../db/repositories/userRepository'

export const useAuthStore = defineStore('auth', () => {
  // State
  const role = ref<UserRole | null>(null)
  const userId = ref<number | null>(null)
  const userName = ref<string | null>(null)

  // 从 localStorage 恢复登录状态
  const savedRole = localStorage.getItem('auth_role')
  const savedUserId = localStorage.getItem('auth_userId')
  const savedUserName = localStorage.getItem('auth_userName')
  if (savedRole && savedUserId) {
    role.value = savedRole as UserRole
    userId.value = Number(savedUserId)
    userName.value = savedUserName
  }

  // Getters
  const isLoggedIn = computed(() => role.value !== null && userId.value !== null)
  const isAdmin = computed(() => role.value === 'admin')

  // Actions
  async function login(pin: string): Promise<boolean> {
    const user = await verifyPin(pin)
    if (!user) return false

    role.value = user.role
    userId.value = user.id
    userName.value = user.name

    // 持久化到 localStorage
    localStorage.setItem('auth_role', user.role)
    localStorage.setItem('auth_userId', String(user.id))
    localStorage.setItem('auth_userName', user.name)

    return true
  }

  function logout() {
    role.value = null
    userId.value = null
    userName.value = null

    localStorage.removeItem('auth_role')
    localStorage.removeItem('auth_userId')
    localStorage.removeItem('auth_userName')
  }

  return {
    role,
    userId,
    userName,
    isLoggedIn,
    isAdmin,
    login,
    logout,
  }
})
