import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import * as studentRepo from '../db/repositories/studentRepository'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as purchaseRepo from '../db/repositories/purchaseRepository'
import type { AttendanceStatus } from '../types'

const statusLabels: Record<AttendanceStatus, string> = {
  present: '到课',
  late: '迟到',
  leave: '请假',
  absent: '旷课',
}

function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): string {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return fileName
}

export async function exportByStudent(studentId: number): Promise<string> {
  const student = await studentRepo.getStudentById(studentId)
  if (!student) throw new Error('学生不存在')

  const wb = XLSX.utils.book_new()

  const attendances = await attendanceRepo.getStudentAttendanceHistory(studentId)
  const attendanceData = attendances.map(a => ({
    '日期': a.date,
    '状态': statusLabels[a.status] || a.status,
    '备注': a.notes || '',
    '修改时间': a.modified_at || '',
    '原始状态': a.original_status
      ? statusLabels[a.original_status as AttendanceStatus] || a.original_status
      : '',
  }))
  const ws1 = XLSX.utils.json_to_sheet(
    attendanceData.length > 0 ? attendanceData : [{ '日期': '', '状态': '', '备注': '' }]
  )
  XLSX.utils.book_append_sheet(wb, ws1, '签到记录')

  const purchases = await purchaseRepo.getPurchasesByStudent(studentId)
  const purchaseData = purchases.map(p => ({
    '日期': p.date,
    '课时数': p.hours,
    '金额': p.amount,
    '备注': p.notes || '',
  }))
  const ws2 = XLSX.utils.json_to_sheet(
    purchaseData.length > 0
      ? purchaseData
      : [{ '日期': '', '课时数': '', '金额': '', '备注': '' }]
  )
  XLSX.utils.book_append_sheet(wb, ws2, '购课记录')

  const fileName = `${student.name}_${dayjs().format('YYYYMMDD')}.xlsx`
  return downloadWorkbook(wb, fileName)
}

export async function exportByMonth(yearMonth: string): Promise<string> {
  const startDate = `${yearMonth}-01`
  const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')
  const daysInMonth = dayjs(startDate).daysInMonth()

  const students = await studentRepo.getActiveStudents()
  const attendances = await attendanceRepo.getAttendanceByDateRange(startDate, endDate)

  const statusMap = new Map<number, Map<string, string>>()
  for (const a of attendances) {
    if (!statusMap.has(a.student_id)) statusMap.set(a.student_id, new Map())
    statusMap.get(a.student_id)!.set(a.date, statusLabels[a.status] || a.status)
  }

  const rows: Record<string, string | number>[] = []
  for (const student of students) {
    const row: Record<string, string | number> = { '姓名': student.name, '班级': student.class_name }
    const dateMap = statusMap.get(student.id)
    let presentCount = 0
    let totalCount = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`
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
  XLSX.utils.book_append_sheet(wb, ws, `${yearMonth}出勤汇总`)

  const fileName = `出勤汇总_${yearMonth}.xlsx`
  return downloadWorkbook(wb, fileName)
}
