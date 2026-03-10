import { database } from '../database'
import type { Attendance, AttendanceStatus } from '../../types'

// 获取某日签到记录
export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  return database.query<Attendance>(
    'SELECT * FROM attendances WHERE date = ? ORDER BY id ASC',
    [date]
  )
}

// 获取某学生某日签到记录
export async function getStudentAttendanceByDate(studentId: number, date: string): Promise<Attendance | null> {
  const rows = await database.query<Attendance>(
    'SELECT * FROM attendances WHERE student_id = ? AND date = ?',
    [studentId, date]
  )
  return rows[0] ?? null
}

// 获取某学生的签到历史
export async function getStudentAttendanceHistory(studentId: number): Promise<Attendance[]> {
  return database.query<Attendance>(
    'SELECT * FROM attendances WHERE student_id = ? ORDER BY date DESC',
    [studentId]
  )
}

// 批量创建签到记录
export async function batchCreateAttendance(records: {
  student_id: number
  date: string
  status: AttendanceStatus
  notes: string
  photo_path: string
  created_by: number
}[]): Promise<void> {
  const statements = records.map(r => ({
    statement: `INSERT INTO attendances (student_id, date, status, notes, photo_path, created_by)
                VALUES (?, ?, ?, ?, ?, ?)`,
    values: [r.student_id, r.date, r.status, r.notes, r.photo_path, r.created_by] as unknown[]
  }))
  await database.executeSet(statements)
}

// 创建单条签到记录
export async function createAttendance(data: {
  student_id: number
  date: string
  status: AttendanceStatus
  notes: string
  photo_path: string
  created_by: number
}): Promise<number> {
  const result = await database.run(
    `INSERT INTO attendances (student_id, date, status, notes, photo_path, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.student_id, data.date, data.status, data.notes, data.photo_path, data.created_by]
  )
  return result.lastId
}

// 修改签到状态（管理员），同时记录审计日志
export async function updateAttendanceStatus(
  id: number,
  newStatus: AttendanceStatus,
  notes: string,
  operatorName: string
): Promise<void> {
  // 获取原始记录
  const rows = await database.query<Attendance>(
    'SELECT * FROM attendances WHERE id = ?',
    [id]
  )
  if (rows.length === 0) throw new Error('签到记录不存在')

  const original = rows[0]!
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 更新签到记录
  await database.run(
    `UPDATE attendances SET status = ?, notes = ?, modified_at = ?, original_status = ? WHERE id = ?`,
    [newStatus, notes, now, original.original_status || original.status, id]
  )

  // 写入审计日志
  await database.run(
    `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, operator)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'attendances',
      id,
      'update_status',
      JSON.stringify({ status: original.status, notes: original.notes }),
      JSON.stringify({ status: newStatus, notes }),
      operatorName
    ]
  )
}

// 获取日期范围内的签到记录
export async function getAttendanceByDateRange(startDate: string, endDate: string): Promise<Attendance[]> {
  return database.query<Attendance>(
    'SELECT * FROM attendances WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC',
    [startDate, endDate]
  )
}

// 获取某日签到统计
export async function getDailyStats(date: string): Promise<{
  total: number
  present: number
  late: number
  leave: number
  absent: number
}> {
  const rows = await database.query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM attendances WHERE date = ? GROUP BY status`,
    [date]
  )
  const stats = { total: 0, present: 0, late: 0, leave: 0, absent: 0 }
  for (const row of rows) {
    const count = row.count
    stats.total += count
    if (row.status === 'present') stats.present = count
    else if (row.status === 'late') stats.late = count
    else if (row.status === 'leave') stats.leave = count
    else if (row.status === 'absent') stats.absent = count
  }
  return stats
}

// 获取某学生出勤统计
export async function getStudentStats(studentId: number): Promise<{
  total: number
  present: number
  late: number
  leave: number
  absent: number
}> {
  const rows = await database.query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM attendances WHERE student_id = ? GROUP BY status`,
    [studentId]
  )
  const stats = { total: 0, present: 0, late: 0, leave: 0, absent: 0 }
  for (const row of rows) {
    const count = row.count
    stats.total += count
    if (row.status === 'present') stats.present = count
    else if (row.status === 'late') stats.late = count
    else if (row.status === 'leave') stats.leave = count
    else if (row.status === 'absent') stats.absent = count
  }
  return stats
}

// 检查某日是否已有签到记录
export async function hasAttendanceForDate(date: string): Promise<boolean> {
  const rows = await database.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM attendances WHERE date = ?',
    [date]
  )
  return (rows[0]?.count ?? 0) > 0
}
