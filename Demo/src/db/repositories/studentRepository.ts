import { localStore } from '../localStore'
import type { Student, StudentStatus, LifecycleTag } from '../../types'

export async function getActiveStudents(): Promise<Student[]> {
  return localStore
    .findWhere<Student>('students', s => s.status === 'active')
    .sort((a, b) => a.remaining_hours - b.remaining_hours || a.name.localeCompare(b.name))
}

export async function getArchivedStudents(): Promise<Student[]> {
  return localStore
    .findWhere<Student>('students', s => s.status === 'archived')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllStudents(): Promise<Student[]> {
  return localStore.getAll<Student>('students').sort((a, b) => a.name.localeCompare(b.name))
}

export async function getStudentById(id: number): Promise<Student | null> {
  return localStore.findById<Student>('students', id)
}

export async function addStudent(data: {
  name: string
  class_name: string
  parent_name: string
  parent_phone: string
  remaining_hours: number
  total_hours: number
}): Promise<number> {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const student = localStore.insert('students', {
    ...data,
    status: 'active' as StudentStatus,
    lifecycle_tag: 'new' as LifecycleTag,
    created_at: now,
  })
  return student.id
}

export async function updateStudent(
  id: number,
  data: { name?: string; class_name?: string; parent_name?: string; parent_phone?: string }
): Promise<void> {
  localStore.update<Student>('students', id, data)
}

export async function updateStudentStatus(id: number, status: StudentStatus): Promise<void> {
  localStore.update<Student>('students', id, { status })
}

export async function updateLifecycleTag(id: number, tag: LifecycleTag): Promise<void> {
  localStore.update<Student>('students', id, { lifecycle_tag: tag })
}

export async function deductHours(id: number, hours: number): Promise<void> {
  const student = localStore.findById<Student>('students', id)
  if (student) {
    localStore.update<Student>('students', id, {
      remaining_hours: Math.max(0, student.remaining_hours - hours),
    })
  }
}

export async function addHours(id: number, hours: number): Promise<void> {
  const student = localStore.findById<Student>('students', id)
  if (student) {
    localStore.update<Student>('students', id, {
      remaining_hours: student.remaining_hours + hours,
      total_hours: student.total_hours + hours,
    })
  }
}

export async function getWarningStudents(threshold: number): Promise<Student[]> {
  return localStore
    .findWhere<Student>('students', s => s.status === 'active' && s.remaining_hours <= threshold)
    .sort((a, b) => a.remaining_hours - b.remaining_hours)
}

export async function getStudentsByClass(className: string): Promise<Student[]> {
  return localStore
    .findWhere<Student>('students', s => s.status === 'active' && s.class_name === className)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllClasses(): Promise<string[]> {
  const students = localStore.findWhere<Student>('students', s => s.status === 'active')
  return [...new Set(students.map(s => s.class_name))].sort()
}

export async function getActiveStudentCount(): Promise<number> {
  return localStore.findWhere<Student>('students', s => s.status === 'active').length
}
