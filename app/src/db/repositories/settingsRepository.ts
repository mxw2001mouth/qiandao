import { database } from '../database'
import * as studentRepo from './studentRepository'
import type { UserRole } from '../../types'

export type ClassScopeRole = Extract<UserRole, 'admin' | 'teacher'>

const SETTINGS_KEYS = {
  classCatalog: 'class_catalog',
  visibleAdmin: 'visible_classes_admin',
  visibleTeacher: 'visible_classes_teacher',
  defaultAdmin: 'default_class_admin',
  defaultTeacher: 'default_class_teacher',
} as const

function getVisibleKey(role: ClassScopeRole): string {
  return role === 'admin' ? SETTINGS_KEYS.visibleAdmin : SETTINGS_KEYS.visibleTeacher
}

function getDefaultKey(role: ClassScopeRole): string {
  return role === 'admin' ? SETTINGS_KEYS.defaultAdmin : SETTINGS_KEYS.defaultTeacher
}

function normalizeClassName(name: string): string {
  return name.trim()
}

function normalizeClassList(list: string[]): string[] {
  return Array.from(
    new Set(
      list
        .map(normalizeClassName)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function parseClassList(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return normalizeClassList(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return []
  }
}

// 获取设置值
export async function getSetting(key: string): Promise<string | null> {
  const rows = await database.query<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  )
  return rows[0]?.value ?? null
}

// 设置值（不存在则插入，存在则更新）
export async function setSetting(key: string, value: string): Promise<void> {
  await database.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}

// 获取预警阈值
export async function getWarningThreshold(): Promise<number> {
  const value = await getSetting('warning_threshold')
  return value ? parseInt(value, 10) : 3
}

// 设置预警阈值
export async function setWarningThreshold(threshold: number): Promise<void> {
  await setSetting('warning_threshold', String(threshold))
}

// 获取所有设置
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await database.query<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  )
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}

// 获取班级目录（首次为空时，自动用学生现有班级做初始化）
export async function getClassCatalog(): Promise<string[]> {
  const saved = parseClassList(await getSetting(SETTINGS_KEYS.classCatalog))
  if (saved.length > 0) return saved

  const fromStudents = normalizeClassList(await studentRepo.getAllClasses())
  if (fromStudents.length > 0) {
    await setSetting(SETTINGS_KEYS.classCatalog, JSON.stringify(fromStudents))
  }
  return fromStudents
}

export async function setClassCatalog(classes: string[]): Promise<void> {
  const normalized = normalizeClassList(classes)
  await setSetting(SETTINGS_KEYS.classCatalog, JSON.stringify(normalized))
}

export async function createClass(className: string): Promise<string[]> {
  const name = normalizeClassName(className)
  if (!name) throw new Error('班级名称不能为空')

  const catalog = await getClassCatalog()
  if (catalog.includes(name)) throw new Error('班级已存在')

  const next = normalizeClassList([...catalog, name])
  await setClassCatalog(next)

  // 新班级自动加入管理员可见范围
  const adminVisible = await getRoleVisibleClasses('admin')
  if (!adminVisible.includes(name)) {
    await setRoleVisibleClasses('admin', [...adminVisible, name])
  }

  return next
}

export async function renameClass(oldClassName: string, newClassName: string): Promise<void> {
  const oldName = normalizeClassName(oldClassName)
  const newName = normalizeClassName(newClassName)
  if (!oldName || !newName) throw new Error('班级名称不能为空')
  if (oldName === newName) return

  const catalog = await getClassCatalog()
  if (!catalog.includes(oldName)) throw new Error('原班级不存在')
  if (catalog.includes(newName)) throw new Error('新班级名称已存在')

  await studentRepo.renameStudentClass(oldName, newName)

  const nextCatalog = normalizeClassList(catalog.map(c => c === oldName ? newName : c))
  await setClassCatalog(nextCatalog)

  const adminVisible = (await getRoleVisibleClasses('admin')).map(c => c === oldName ? newName : c)
  const teacherVisible = (await getRoleVisibleClasses('teacher')).map(c => c === oldName ? newName : c)
  await setRoleVisibleClasses('admin', adminVisible)
  await setRoleVisibleClasses('teacher', teacherVisible)

  const adminDefault = await getRoleDefaultClass('admin')
  const teacherDefault = await getRoleDefaultClass('teacher')
  if (adminDefault === oldName) await setRoleDefaultClass('admin', newName)
  if (teacherDefault === oldName) await setRoleDefaultClass('teacher', newName)
}

export async function deleteClass(className: string): Promise<void> {
  const name = normalizeClassName(className)
  if (!name) throw new Error('班级名称不能为空')

  const linkedCount = await studentRepo.getStudentCountByClass(name)
  if (linkedCount > 0) {
    throw new Error('该班级仍有关联学生，无法删除')
  }

  const catalog = await getClassCatalog()
  if (!catalog.includes(name)) return

  await setClassCatalog(catalog.filter(c => c !== name))
  await setRoleVisibleClasses('admin', (await getRoleVisibleClasses('admin')).filter(c => c !== name))
  await setRoleVisibleClasses('teacher', (await getRoleVisibleClasses('teacher')).filter(c => c !== name))

  const adminDefault = await getRoleDefaultClass('admin')
  const teacherDefault = await getRoleDefaultClass('teacher')
  if (adminDefault === name) await setRoleDefaultClass('admin', '')
  if (teacherDefault === name) await setRoleDefaultClass('teacher', '')

  await ensureRoleDefaultClass('admin')
  await ensureRoleDefaultClass('teacher')
}

export async function getRoleVisibleClasses(role: ClassScopeRole): Promise<string[]> {
  const catalog = await getClassCatalog()
  const rawVisible = await getSetting(getVisibleKey(role))
  const visible = parseClassList(rawVisible)
  const filtered = visible.filter(c => catalog.includes(c))

  if (filtered.length !== visible.length) {
    await setSetting(getVisibleKey(role), JSON.stringify(filtered))
  }

  // 仅首次未配置时，管理员默认可见全部班级；若已显式配置为空，保持为空。
  if (role === 'admin' && rawVisible === null && filtered.length === 0 && catalog.length > 0) {
    await setSetting(getVisibleKey(role), JSON.stringify(catalog))
    return catalog
  }

  return filtered
}

export async function setRoleVisibleClasses(role: ClassScopeRole, classes: string[]): Promise<void> {
  const catalog = await getClassCatalog()
  const normalized = normalizeClassList(classes).filter(c => catalog.includes(c))
  await setSetting(getVisibleKey(role), JSON.stringify(normalized))
  await ensureRoleDefaultClass(role)
}

export async function getRoleDefaultClass(role: ClassScopeRole): Promise<string> {
  const value = await getSetting(getDefaultKey(role))
  return value ? normalizeClassName(value) : ''
}

export async function setRoleDefaultClass(role: ClassScopeRole, className: string): Promise<void> {
  const normalized = normalizeClassName(className)
  if (!normalized) {
    await setSetting(getDefaultKey(role), '')
    return
  }

  const visible = await getRoleVisibleClasses(role)
  if (!visible.includes(normalized)) {
    throw new Error('默认班级必须在可见班级范围内')
  }
  await setSetting(getDefaultKey(role), normalized)
}

export async function ensureRoleDefaultClass(role: ClassScopeRole): Promise<{ defaultClass: string; notice: string }> {
  const visible = await getRoleVisibleClasses(role)
  const currentDefault = await getRoleDefaultClass(role)

  if (visible.length === 0) {
    if (currentDefault) await setSetting(getDefaultKey(role), '')
    return { defaultClass: '', notice: '' }
  }

  if (currentDefault && visible.includes(currentDefault)) {
    return { defaultClass: currentDefault, notice: '' }
  }

  const fallback = visible[0]!
  await setSetting(getDefaultKey(role), fallback)
  return { defaultClass: fallback, notice: '默认班级已自动调整为首个可见班级' }
}

export async function getRoleClassScope(role: ClassScopeRole): Promise<{
  visibleClasses: string[]
  defaultClass: string
  notice: string
}> {
  const visibleClasses = await getRoleVisibleClasses(role)
  const ensured = await ensureRoleDefaultClass(role)
  return {
    visibleClasses,
    defaultClass: ensured.defaultClass,
    notice: ensured.notice,
  }
}
