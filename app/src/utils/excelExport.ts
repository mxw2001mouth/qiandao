import * as XLSX from 'xlsx'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import dayjs from 'dayjs'
import * as studentRepo from '../db/repositories/studentRepository'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as purchaseRepo from '../db/repositories/purchaseRepository'
import type { AttendanceStatus } from '../types'

const EXPORT_DIR = 'QiandaoExport'

const statusLabels: Record<AttendanceStatus, string> = {
  present: '到课',
  late: '迟到',
  leave: '请假',
  absent: '请假',
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]/g, '_').trim()
}

function normalizeYearMonth(yearMonth: string): string {
  const match = yearMonth.trim().match(/(\d{4})\D*(\d{1,2})/)
  if (!match) {
    throw new Error('月份格式无效，请重新选择月份')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  if (!year || month < 1 || month > 12) {
    throw new Error('月份格式无效，请重新选择月份')
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

async function ensureExportPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
  const checked = await Filesystem.checkPermissions()
  if (checked.publicStorage === 'granted') return

  const requested = await Filesystem.requestPermissions()
  if (requested.publicStorage !== 'granted') {
    throw new Error('导出失败：未授予存储权限，请在系统设置中允许存储权限后重试')
  }
}

// 确保导出目录存在
async function ensureDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: EXPORT_DIR,
      directory: Directory.Documents,
      recursive: true,
    })
  } catch {
    // 目录可能已存在
  }
}

// 将 workbook 保存到文件
async function saveWorkbook(wb: XLSX.WorkBook, fileName: string): Promise<string> {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
  const safeFileName = sanitizeFileName(fileName)

  if (!Capacitor.isNativePlatform()) {
    // 浏览器：触发下载
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeFileName
    a.click()
    URL.revokeObjectURL(url)
    return `下载：${safeFileName}`
  }

  // Android 原生：写入 Documents 目录
  await ensureExportPermission()
  await ensureDir()
  const filePath = `${EXPORT_DIR}/${safeFileName}`
  await Filesystem.writeFile({
    path: filePath,
    data,
    directory: Directory.Documents,
  })
  return filePath
}

// 按学生导出：签到记录 + 购课历史
export async function exportByStudent(studentId: number): Promise<string> {
  const student = await studentRepo.getStudentById(studentId)
  if (!student) throw new Error('学生不存在')

  const wb = XLSX.utils.book_new()

  // Sheet 1: 签到记录
  const attendances = await attendanceRepo.getStudentAttendanceHistory(studentId)
  const attendanceData = attendances.map(a => ({
    '日期': a.date,
    '状态': statusLabels[a.status] || a.status,
    '备注': a.notes || '',
    '修改时间': a.modified_at || '',
    '原始状态': a.original_status ? (statusLabels[a.original_status as AttendanceStatus] || a.original_status) : '',
  }))
  const ws1 = XLSX.utils.json_to_sheet(attendanceData.length > 0 ? attendanceData : [{ '日期': '', '状态': '', '备注': '' }])
  XLSX.utils.book_append_sheet(wb, ws1, '签到记录')

  // Sheet 2: 购课/续费历史
  const purchases = await purchaseRepo.getPurchasesByStudent(studentId)
  const purchaseData = purchases.map(p => ({
    '日期': p.date,
    '课时数': p.hours,
    '金额': p.amount,
    '备注': p.notes || '',
  }))
  const ws2 = XLSX.utils.json_to_sheet(purchaseData.length > 0 ? purchaseData : [{ '日期': '', '课时数': '', '金额': '', '备注': '' }])
  XLSX.utils.book_append_sheet(wb, ws2, '购课记录')

  // 保存
  const fileName = `${student.name}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
  return saveWorkbook(wb, fileName)
}

// 按月导出：所有学生当月出勤汇总
export async function exportByMonth(yearMonth: string): Promise<string> {
  const month = normalizeYearMonth(yearMonth)
  // yearMonth 格式：YYYY-MM
  const startDate = `${month}-01`
  const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')
  const daysInMonth = dayjs(startDate).daysInMonth()

  // 获取所有在读学生
  const students = await studentRepo.getActiveStudents()

  // 获取当月所有签到记录
  const attendances = await attendanceRepo.getAttendanceByDateRange(startDate, endDate)

  // 构建 studentId → { date → status } 映射
  const statusMap = new Map<number, Map<string, string>>()
  for (const a of attendances) {
    if (!statusMap.has(a.student_id)) {
      statusMap.set(a.student_id, new Map())
    }
    statusMap.get(a.student_id)!.set(a.date, statusLabels[a.status] || a.status)
  }

  // 构建表头：姓名 + 每日列 + 出勤统计
  const rows: Record<string, string | number>[] = []
  for (const student of students) {
    const row: Record<string, string | number> = { '姓名': student.name, '班级': student.class_name }
    const dateMap = statusMap.get(student.id)
    let presentCount = 0
    let totalCount = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const status = dateMap?.get(dateStr) || ''
      row[`${d}日`] = status
      if (status) {
        totalCount++
        if (status === '到课' || status === '迟到') presentCount++
      }
    }

    row['出勤次数'] = presentCount
    row['总记录'] = totalCount
    row['剩余课时'] = student.remaining_hours
    rows.push(row)
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ '姓名': '暂无数据' }])
  XLSX.utils.book_append_sheet(wb, ws, `${month}出勤汇总`)

  const fileName = `出勤汇总_${month}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
  return saveWorkbook(wb, fileName)
}
