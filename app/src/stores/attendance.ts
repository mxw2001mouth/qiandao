import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AttendanceStatus } from '../types'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as studentRepo from '../db/repositories/studentRepository'
import { useAuthStore } from './auth'
import { updateAllLifecycleTags } from '../utils/lifecycle'

export const useAttendanceStore = defineStore('attendance', () => {
  // State：当日每个学生的签到状态
  const todayAttendances = ref<Map<number, { status: AttendanceStatus; notes: string }>>(new Map())
  const groupPhoto = ref<string | null>(null)
  const isSubmitting = ref(false)

  // 设置某学生的签到状态
  function setStatus(studentId: number, status: AttendanceStatus, notes: string = '') {
    todayAttendances.value.set(studentId, { status, notes })
  }

  // 批量设置所有学生为默认状态（到课）
  function setAllPresent(studentIds: number[]) {
    for (const id of studentIds) {
      if (!todayAttendances.value.has(id)) {
        todayAttendances.value.set(id, { status: 'present', notes: '' })
      }
    }
  }

  // 设置合影照片路径
  function setGroupPhoto(path: string) {
    groupPhoto.value = path
  }

  // 提交当日签到
  async function submitAll(date: string): Promise<void> {
    const auth = useAuthStore()
    if (!auth.userId) throw new Error('未登录')
    if (!groupPhoto.value) throw new Error('请先拍摄合影后再提交签到')

    isSubmitting.value = true
    try {
      const records = Array.from(todayAttendances.value.entries()).map(([studentId, data]) => ({
        student_id: studentId,
        date,
        status: data.status,
        notes: data.notes,
        photo_path: groupPhoto.value || '',
        created_by: auth.userId!,
      }))

      // 批量写入签到记录
      await attendanceRepo.batchCreateAttendance(records)

      // 扣减课时：到课和迟到各扣1课时
      for (const [studentId, data] of todayAttendances.value.entries()) {
        if (data.status === 'present' || data.status === 'late') {
          await studentRepo.deductHours(studentId, 1)
        }
      }

      // 更新生命周期标签（课时变化后可能触发预警/流失）
      await updateAllLifecycleTags()
    } finally {
      isSubmitting.value = false
    }
  }

  // 根据日期加载签到记录
  async function fetchByDate(date: string): Promise<void> {
    const records = await attendanceRepo.getAttendanceByDate(date)
    todayAttendances.value.clear()
    for (const record of records) {
      todayAttendances.value.set(record.student_id, {
        status: record.status,
        notes: record.notes,
      })
    }
    // 取第一条记录的照片路径作为合影
    const firstRecord = records[0]
    if (firstRecord && firstRecord.photo_path) {
      groupPhoto.value = firstRecord.photo_path
    } else {
      groupPhoto.value = null
    }
  }

  // 重置状态（新的一天）
  function reset() {
    todayAttendances.value.clear()
    groupPhoto.value = null
  }

  // 获取某学生的签到状态
  function getStatus(studentId: number): { status: AttendanceStatus; notes: string } | undefined {
    return todayAttendances.value.get(studentId)
  }

  return {
    todayAttendances,
    groupPhoto,
    isSubmitting,
    setStatus,
    setAllPresent,
    setGroupPhoto,
    submitAll,
    fetchByDate,
    reset,
    getStatus,
  }
})
