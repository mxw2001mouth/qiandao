import { database } from '../database'
import type { User } from '../../types'

// 通过 PIN 码验证用户
export async function verifyPin(pin: string): Promise<User | null> {
  const rows = await database.query<User>(
    'SELECT id, role, pin, name FROM users WHERE pin = ?',
    [pin]
  )
  return rows[0] ?? null
}

// 获取所有用户
export async function getAllUsers(): Promise<User[]> {
  return database.query<User>('SELECT id, role, pin, name FROM users')
}

// 根据 ID 获取用户
export async function getUserById(id: number): Promise<User | null> {
  const rows = await database.query<User>(
    'SELECT id, role, pin, name FROM users WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

// 更新 PIN 码
export async function updatePin(userId: number, newPin: string): Promise<void> {
  await database.run(
    'UPDATE users SET pin = ? WHERE id = ?',
    [newPin, userId]
  )
}
