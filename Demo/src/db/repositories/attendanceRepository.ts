import { localStore } from '../localStore'
import type { Attendance, AttendanceStatus } from '../../types'

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  return localStore
    .findWhere<Attendance>('attendances', a => a.date === date)
    .sort((a, b) => a.id - b.id)
}

export async function getStudentAttendanceByDate(
  studentId: number,
  date: string
): Promise<Attendance | null> {
  const results = localStore.findWhere<Attendance>(
    'attendances',
    a => a.student_id === studentId && a.date === date
  )
  return results[0] ?? null
}

export async function getStudentAttendanceHistory(studentId: number): Promise<Attendance[]> {
  return localStore
    .findWhere<Attendance>('attendances', a => a.student_id === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function batchCreateAttendance(
  records: {
    student_id: number
    date: string
    status: AttendanceStatus
    notes: string
    photo_path: string
    created_by: number
  }[]
): Promise<void> {
  for (const r of records) {
    const existing = await getStudentAttendanceByDate(r.student_id, r.date)
    if (!existing) {
      localStore.insert('attendances', {
        ...r,
        modified_at: '',
        original_status: '',
      })
    }
  }
}

export async function createAttendance(data: {
  student_id: number
  date: string
  status: AttendanceStatus
  notes: string
  photo_path: string
  created_by: number
}): Promise<number> {
  const item = localStore.insert('attendances', {
    ...data,
    modified_at: '',
    original_status: '',
  })
  return item.id
}

export async function updateAttendanceStatus(
  id: number,
  newStatus: AttendanceStatus,
  notes: string,
  operatorName: string
): Promise<void> {
  const record = localStore.findById<Attendance>('attendances', id)
  if (!record) throw new Error('签到记录不存在')

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  localStore.update<Attendance>('attendances', id, {
    status: newStatus,
    notes,
    modified_at: now,
    original_status: record.original_status || record.status,
  })

  localStore.insert('audit_log', {
    table_name: 'attendances',
    record_id: id,
    action: 'update_status',
    old_value: JSON.stringify({ status: record.status, notes: record.notes }),
    new_value: JSON.stringify({ status: newStatus, notes }),
    operator: operatorName,
    created_at: now,
  })
}

export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string
): Promise<Attendance[]> {
  return localStore
    .findWhere<Attendance>('attendances', a => a.date >= startDate && a.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
}

export async function getDailyStats(date: string): Promise<{
  total: number
  present: number
  late: number
  leave: number
  absent: number
}> {
  const records = await getAttendanceByDate(date)
  const stats = { total: records.length, present: 0, late: 0, leave: 0, absent: 0 }
  for (const r of records) {
    if (r.status === 'present') stats.present++
    else if (r.status === 'late') stats.late++
    else if (r.status === 'leave') stats.leave++
    else if (r.status === 'absent') stats.absent++
  }
  return stats
}

export async function getStudentStats(studentId: number): Promise<{
  total: number
  present: number
  late: number
  leave: number
  absent: number
}> {
  const records = localStore.findWhere<Attendance>('attendances', a => a.student_id === studentId)
  const stats = { total: records.length, present: 0, late: 0, leave: 0, absent: 0 }
  for (const r of records) {
    if (r.status === 'present') stats.present++
    else if (r.status === 'late') stats.late++
    else if (r.status === 'leave') stats.leave++
    else if (r.status === 'absent') stats.absent++
  }
  return stats
}

export async function hasAttendanceForDate(date: string): Promise<boolean> {
  return localStore.findWhere<Attendance>('attendances', a => a.date === date).length > 0
}
