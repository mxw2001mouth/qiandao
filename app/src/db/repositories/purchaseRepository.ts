import { database } from '../database'
import type { Purchase } from '../../types'

// 获取某学生的购课/续费历史
export async function getPurchasesByStudent(studentId: number): Promise<Purchase[]> {
  return database.query<Purchase>(
    'SELECT * FROM purchases WHERE student_id = ? ORDER BY date DESC',
    [studentId]
  )
}

// 创建购课/续费记录
export async function createPurchase(data: {
  student_id: number
  date: string
  hours: number
  amount: number
  notes: string
}): Promise<number> {
  const result = await database.run(
    `INSERT INTO purchases (student_id, date, hours, amount, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [data.student_id, data.date, data.hours, data.amount, data.notes]
  )
  return result.lastId
}

// 获取所有购课记录
export async function getAllPurchases(): Promise<Purchase[]> {
  return database.query<Purchase>(
    'SELECT * FROM purchases ORDER BY date DESC'
  )
}

// 获取日期范围内的购课记录
export async function getPurchasesByDateRange(startDate: string, endDate: string): Promise<Purchase[]> {
  return database.query<Purchase>(
    'SELECT * FROM purchases WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [startDate, endDate]
  )
}

// 获取月度收入统计
export async function getMonthlyRevenue(yearMonth: string): Promise<number> {
  const rows = await database.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE date LIKE ?`,
    [`${yearMonth}%`]
  )
  return rows[0]?.total ?? 0
}

// 获取某学生总购课金额
export async function getStudentTotalSpent(studentId: number): Promise<number> {
  const rows = await database.query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE student_id = ?',
    [studentId]
  )
  return rows[0]?.total ?? 0
}
