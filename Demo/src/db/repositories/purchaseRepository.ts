import { localStore } from '../localStore'
import type { Purchase } from '../../types'

export async function getPurchasesByStudent(studentId: number): Promise<Purchase[]> {
  return localStore
    .findWhere<Purchase>('purchases', p => p.student_id === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function createPurchase(data: {
  student_id: number
  date: string
  hours: number
  amount: number
  notes: string
}): Promise<number> {
  const item = localStore.insert('purchases', data)
  return item.id
}

export async function getAllPurchases(): Promise<Purchase[]> {
  return localStore.getAll<Purchase>('purchases').sort((a, b) => b.date.localeCompare(a.date))
}

export async function getPurchasesByDateRange(startDate: string, endDate: string): Promise<Purchase[]> {
  return localStore
    .findWhere<Purchase>('purchases', p => p.date >= startDate && p.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getMonthlyRevenue(yearMonth: string): Promise<number> {
  const purchases = localStore.findWhere<Purchase>('purchases', p => p.date.startsWith(yearMonth))
  return purchases.reduce((sum, p) => sum + p.amount, 0)
}

export async function getStudentTotalSpent(studentId: number): Promise<number> {
  const purchases = localStore.findWhere<Purchase>('purchases', p => p.student_id === studentId)
  return purchases.reduce((sum, p) => sum + p.amount, 0)
}
