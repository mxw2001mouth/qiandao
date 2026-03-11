import { localStore } from '../localStore'
import type { User } from '../../types'

export async function verifyPin(pin: string): Promise<User | null> {
  const users = localStore.findWhere<User>('users', u => u.pin === pin)
  return users[0] ?? null
}

export async function getAllUsers(): Promise<User[]> {
  return localStore.getAll<User>('users')
}

export async function getUserById(id: number): Promise<User | null> {
  return localStore.findById<User>('users', id)
}

export async function updatePin(userId: number, newPin: string): Promise<void> {
  localStore.update<User>('users', userId, { pin: newPin })
}
