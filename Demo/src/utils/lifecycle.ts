import dayjs from 'dayjs'
import type { Student, LifecycleTag } from '../types'
import { getActiveStudents, updateLifecycleTag } from '../db/repositories/studentRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'

// 计算单个学生的生命周期标签
export function calculateLifecycleTag(
  student: Student,
  warningThreshold: number
): LifecycleTag {
  // 课时已清零 → 流失风险
  if (student.remaining_hours <= 0) {
    return 'at_risk'
  }

  // 首次购课30天内 → 新生
  const daysSinceCreated = dayjs().diff(dayjs(student.created_at), 'day')
  if (daysSinceCreated <= 30) {
    return 'new'
  }

  // 课时即将用完 → 预警
  if (student.remaining_hours <= warningThreshold) {
    return 'warning'
  }

  // 其余 → 活跃
  return 'active'
}

// 批量更新所有在读学生的生命周期标签
export async function updateAllLifecycleTags(): Promise<number> {
  const threshold = await getWarningThreshold()
  const students = await getActiveStudents()
  let updated = 0

  for (const student of students) {
    const newTag = calculateLifecycleTag(student, threshold)
    if (newTag !== student.lifecycle_tag) {
      await updateLifecycleTag(student.id, newTag)
      updated++
    }
  }

  return updated
}
