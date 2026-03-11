import { localStore } from '../localStore'
import type { Followup, FollowupStatus } from '../../types'

export async function getPendingFollowups(): Promise<
  (Followup & { student_name: string; remaining_hours: number })[]
> {
  const followups = localStore.findWhere<Followup>('followup', f => f.status !== 'renewed')
  const result: (Followup & { student_name: string; remaining_hours: number })[] = []
  for (const f of followups) {
    const student = localStore.findById<{ id: number; name: string; status: string; remaining_hours: number }>(
      'students',
      f.student_id
    )
    if (student && student.status === 'active') {
      result.push({ ...f, student_name: student.name, remaining_hours: student.remaining_hours })
    }
  }
  return result.sort((a, b) => a.remaining_hours - b.remaining_hours)
}

export async function getFollowupByStudent(studentId: number): Promise<Followup | null> {
  const followups = localStore
    .findWhere<Followup>('followup', f => f.student_id === studentId)
    .sort((a, b) => b.id - a.id)
  return followups[0] ?? null
}

export async function upsertFollowup(
  studentId: number,
  status: FollowupStatus,
  notes: string
): Promise<void> {
  const existing = await getFollowupByStudent(studentId)
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  if (existing) {
    localStore.update<Followup>('followup', existing.id, { status, notes, updated_at: now })
  } else {
    localStore.insert('followup', { student_id: studentId, status, notes, updated_at: now })
  }
}

export async function updateFollowupStatus(
  id: number,
  status: FollowupStatus,
  notes: string
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  localStore.update<Followup>('followup', id, { status, notes, updated_at: now })
}

export async function removeFollowup(studentId: number): Promise<void> {
  localStore.deleteWhere<Followup>('followup', f => f.student_id === studentId)
}

export async function ensureFollowupsForWarningStudents(threshold: number): Promise<void> {
  const students = localStore.findWhere<{ id: number; status: string; remaining_hours: number }>(
    'students',
    s => s.status === 'active' && s.remaining_hours <= threshold
  )
  const existingFollowups = localStore.findWhere<Followup>('followup', f => f.status !== 'renewed')
  const existingStudentIds = new Set(existingFollowups.map(f => f.student_id))
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  for (const s of students) {
    if (!existingStudentIds.has(s.id)) {
      localStore.insert('followup', {
        student_id: s.id,
        status: 'pending' as FollowupStatus,
        notes: '',
        updated_at: now,
      })
    }
  }
}
