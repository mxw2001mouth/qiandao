import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Student } from '../types'
import * as studentRepo from '../db/repositories/studentRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'

export const useStudentStore = defineStore('student', () => {
  // State
  const students = ref<Student[]>([])
  const isLoading = ref(false)
  const warningThreshold = ref(3)

  // Getters
  const activeStudents = computed(() =>
    students.value.filter(s => s.status === 'active')
  )

  const archivedStudents = computed(() =>
    students.value.filter(s => s.status === 'archived')
  )

  // 根据剩余课时返回颜色标识
  function getStudentColor(remainingHours: number): 'success' | 'warning' | 'danger' {
    if (remainingHours <= 0) return 'danger'
    if (remainingHours <= warningThreshold.value) return 'warning'
    return 'success'
  }

  // Actions
  async function fetchStudents() {
    isLoading.value = true
    try {
      students.value = await studentRepo.getAllStudents()
      warningThreshold.value = await getWarningThreshold()
    } finally {
      isLoading.value = false
    }
  }

  async function addStudent(data: {
    name: string
    class_name: string
    parent_name: string
    parent_phone: string
    remaining_hours: number
    total_hours: number
  }): Promise<number> {
    const id = await studentRepo.addStudent(data)
    await fetchStudents()
    return id
  }

  async function updateStudent(id: number, data: {
    name?: string
    class_name?: string
    parent_name?: string
    parent_phone?: string
  }) {
    await studentRepo.updateStudent(id, data)
    await fetchStudents()
  }

  async function archiveStudent(id: number) {
    await studentRepo.updateStudentStatus(id, 'archived')
    await fetchStudents()
  }

  async function restoreStudent(id: number) {
    await studentRepo.updateStudentStatus(id, 'active')
    await fetchStudents()
  }

  return {
    students,
    isLoading,
    warningThreshold,
    activeStudents,
    archivedStudents,
    getStudentColor,
    fetchStudents,
    addStudent,
    updateStudent,
    archiveStudent,
    restoreStudent,
  }
})
