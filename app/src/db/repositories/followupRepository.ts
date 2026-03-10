import { database } from '../database'
import type { Followup, FollowupStatus } from '../../types'

// 获取所有待跟进记录（非 renewed）
export async function getPendingFollowups(): Promise<(Followup & { student_name: string; remaining_hours: number })[]> {
  return database.query(
    `SELECT f.*, s.name as student_name, s.remaining_hours
     FROM followup f
     JOIN students s ON f.student_id = s.id
     WHERE f.status != 'renewed' AND s.status = 'active'
     ORDER BY s.remaining_hours ASC`,
  )
}

// 获取某学生的跟进记录
export async function getFollowupByStudent(studentId: number): Promise<Followup | null> {
  const rows = await database.query<Followup>(
    'SELECT * FROM followup WHERE student_id = ? ORDER BY id DESC LIMIT 1',
    [studentId]
  )
  return rows[0] ?? null
}

// 创建或更新跟进记录
export async function upsertFollowup(studentId: number, status: FollowupStatus, notes: string): Promise<void> {
  const existing = await getFollowupByStudent(studentId)
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  if (existing) {
    await database.run(
      'UPDATE followup SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
      [status, notes, now, existing.id]
    )
  } else {
    await database.run(
      'INSERT INTO followup (student_id, status, notes, updated_at) VALUES (?, ?, ?, ?)',
      [studentId, status, notes, now]
    )
  }
}

// 更新跟进状态
export async function updateFollowupStatus(id: number, status: FollowupStatus, notes: string): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  await database.run(
    'UPDATE followup SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
    [status, notes, now, id]
  )
}

// 删除某学生的跟进记录（续费后）
export async function removeFollowup(studentId: number): Promise<void> {
  await database.run(
    'DELETE FROM followup WHERE student_id = ?',
    [studentId]
  )
}

// 自动为预警学生创建跟进记录
export async function ensureFollowupsForWarningStudents(threshold: number): Promise<void> {
  // 获取需要跟进的学生（课时 <= 阈值且在读，且没有未完成的跟进记录）
  await database.run(
    `INSERT INTO followup (student_id, status, notes, updated_at)
     SELECT s.id, 'pending', '', datetime('now', 'localtime')
     FROM students s
     WHERE s.status = 'active'
       AND s.remaining_hours <= ?
       AND s.id NOT IN (
         SELECT student_id FROM followup WHERE status != 'renewed'
       )`,
    [threshold]
  )
}
