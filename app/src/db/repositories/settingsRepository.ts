import { database } from '../database'

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
