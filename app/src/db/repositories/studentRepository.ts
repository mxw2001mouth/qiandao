import { database } from '../database'
import type { Student, StudentStatus, LifecycleTag } from '../../types'

// 获取所有在读学生
export async function getActiveStudents(): Promise<Student[]> {
  return database.query<Student>(
    'SELECT * FROM students WHERE status = ? ORDER BY remaining_hours ASC, name ASC',
    ['active']
  )
}

// 获取归档学生
export async function getArchivedStudents(): Promise<Student[]> {
  return database.query<Student>(
    'SELECT * FROM students WHERE status = ? ORDER BY name ASC',
    ['archived']
  )
}

// 获取所有学生
export async function getAllStudents(): Promise<Student[]> {
  return database.query<Student>('SELECT * FROM students ORDER BY name ASC')
}

// 根据 ID 获取学生
export async function getStudentById(id: number): Promise<Student | null> {
  const rows = await database.query<Student>(
    'SELECT * FROM students WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

// 新增学生
export async function addStudent(data: {
  name: string
  class_name: string
  parent_name: string
  parent_phone: string
  remaining_hours: number
  total_hours: number
}): Promise<number> {
  const result = await database.run(
    `INSERT INTO students (name, class_name, parent_name, parent_phone, remaining_hours, total_hours, status, lifecycle_tag)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 'new')`,
    [data.name, data.class_name, data.parent_name, data.parent_phone, data.remaining_hours, data.total_hours]
  )
  return result.lastId
}

// 更新学生基本信息
export async function updateStudent(id: number, data: {
  name?: string
  class_name?: string
  parent_name?: string
  parent_phone?: string
}): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.class_name !== undefined) { fields.push('class_name = ?'); values.push(data.class_name) }
  if (data.parent_name !== undefined) { fields.push('parent_name = ?'); values.push(data.parent_name) }
  if (data.parent_phone !== undefined) { fields.push('parent_phone = ?'); values.push(data.parent_phone) }

  if (fields.length === 0) return

  values.push(id)
  await database.run(
    `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
}

// 更新学生状态（在读/退课）
export async function updateStudentStatus(id: number, status: StudentStatus): Promise<void> {
  await database.run(
    'UPDATE students SET status = ? WHERE id = ?',
    [status, id]
  )
}

// 更新生命周期标签
export async function updateLifecycleTag(id: number, tag: LifecycleTag): Promise<void> {
  await database.run(
    'UPDATE students SET lifecycle_tag = ? WHERE id = ?',
    [tag, id]
  )
}

// 扣减课时
export async function deductHours(id: number, hours: number): Promise<void> {
  await database.run(
    'UPDATE students SET remaining_hours = MAX(0, remaining_hours - ?) WHERE id = ?',
    [hours, id]
  )
}

// 增加课时（续费）
export async function addHours(id: number, hours: number): Promise<void> {
  await database.run(
    'UPDATE students SET remaining_hours = remaining_hours + ?, total_hours = total_hours + ? WHERE id = ?',
    [hours, hours, id]
  )
}

// 获取预警学生（剩余课时 <= 阈值 且在读）
export async function getWarningStudents(threshold: number): Promise<Student[]> {
  return database.query<Student>(
    'SELECT * FROM students WHERE status = ? AND remaining_hours <= ? ORDER BY remaining_hours ASC',
    ['active', threshold]
  )
}

// 按班级获取在读学生
export async function getStudentsByClass(className: string): Promise<Student[]> {
  return database.query<Student>(
    'SELECT * FROM students WHERE status = ? AND class_name = ? ORDER BY name ASC',
    ['active', className]
  )
}

// 获取所有班级名称
export async function getAllClasses(): Promise<string[]> {
  const rows = await database.query<{ class_name: string }>(
    `SELECT DISTINCT class_name
     FROM students
     WHERE TRIM(class_name) <> ''
     ORDER BY class_name`
  )
  return rows.map(r => r.class_name)
}

// 获取某班级关联学生数（含在读与归档）
export async function getStudentCountByClass(className: string): Promise<number> {
  const rows = await database.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM students WHERE class_name = ?',
    [className]
  )
  return rows[0]?.count ?? 0
}

// 批量重命名学生班级（含在读与归档）
export async function renameStudentClass(oldClassName: string, newClassName: string): Promise<void> {
  await database.run(
    'UPDATE students SET class_name = ? WHERE class_name = ?',
    [newClassName, oldClassName]
  )
}

// 获取学生总数（在读）
export async function getActiveStudentCount(): Promise<number> {
  const rows = await database.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM students WHERE status = ?',
    ['active']
  )
  return rows[0]?.count ?? 0
}
