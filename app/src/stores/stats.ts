import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import type { Student, Attendance } from '../types'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as purchaseRepo from '../db/repositories/purchaseRepository'
import * as studentRepo from '../db/repositories/studentRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'

// 学生出勤排行项
export interface StudentAttendanceRank {
  student: Student
  attendanceRate: number
  presentCount: number
  lateCount: number
  leaveCount: number
  absentCount: number
}

// 课时预警项
export interface HourWarningItem {
  student: Student
  weeklyAvg: number
  depletionDate: string // YYYY-MM-DD 或 '—'
}

// 续费转化数据
export interface RenewalConversion {
  renewed: number
  lost: number
  rate: number
}

export const useStatsStore = defineStore('stats', () => {
  // === 出勤统计 ===
  const monthlyAttendanceRates = ref<number[]>([])     // 当月每天出勤率
  const monthlyDays = ref<string[]>([])                 // 当月日期标签
  const statusDistribution = ref<{ present: number; late: number; leave: number; absent: number }>({
    present: 0, late: 0, leave: 0, absent: 0,
  })
  const studentRanking = ref<StudentAttendanceRank[]>([])

  // === 经营统计 ===
  const revenueMonths = ref<string[]>([])
  const revenueValues = ref<number[]>([])
  const lifecycleDistribution = ref<{ name: string; value: number }[]>([])
  const hourWarnings = ref<HourWarningItem[]>([])
  const renewalConversion = ref<RenewalConversion>({ renewed: 0, lost: 0, rate: 0 })

  const isLoading = ref(false)

  // 加载出勤统计（指定年月）
  async function loadAttendanceStats(year: number, month: number) {
    isLoading.value = true
    try {
      const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
      const endDate = startDate.endOf('month')
      const daysInMonth = endDate.date()
      const startStr = startDate.format('YYYY-MM-DD')
      const endStr = endDate.format('YYYY-MM-DD')

      // 获取当月所有签到记录
      const records = await attendanceRepo.getAttendanceByDateRange(startStr, endStr)

      // 按日期分组计算出勤率
      const dayMap = new Map<string, Attendance[]>()
      for (const r of records) {
        const list = dayMap.get(r.date) || []
        list.push(r)
        dayMap.set(r.date, list)
      }

      const days: string[] = []
      const rates: number[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = startDate.date(d).format('YYYY-MM-DD')
        days.push(String(d))
        const dayRecords = dayMap.get(dateStr)
        if (!dayRecords || dayRecords.length === 0) {
          rates.push(0)
          continue
        }
        const present = dayRecords.filter(r => r.status === 'present').length
        const late = dayRecords.filter(r => r.status === 'late').length
        const absent = dayRecords.filter(r => r.status === 'absent').length
        const denominator = present + late + absent
        rates.push(denominator > 0 ? Math.round((present + late) / denominator * 100) : 0)
      }
      monthlyDays.value = days
      monthlyAttendanceRates.value = rates

      // 当月状态分布累计
      let pCount = 0, lCount = 0, lvCount = 0, aCount = 0
      for (const r of records) {
        if (r.status === 'present') pCount++
        else if (r.status === 'late') lCount++
        else if (r.status === 'leave') lvCount++
        else if (r.status === 'absent') aCount++
      }
      statusDistribution.value = { present: pCount, late: lCount, leave: lvCount, absent: aCount }

      // 学生出勤排行
      const activeStudents = await studentRepo.getActiveStudents()
      const ranking: StudentAttendanceRank[] = []
      for (const student of activeStudents) {
        const studentRecords = records.filter(r => r.student_id === student.id)
        const sp = studentRecords.filter(r => r.status === 'present').length
        const sl = studentRecords.filter(r => r.status === 'late').length
        const sa = studentRecords.filter(r => r.status === 'absent').length
        const slv = studentRecords.filter(r => r.status === 'leave').length
        const denom = sp + sl + sa
        ranking.push({
          student,
          attendanceRate: denom > 0 ? Math.round((sp + sl) / denom * 100) : 0,
          presentCount: sp,
          lateCount: sl,
          leaveCount: slv,
          absentCount: sa,
        })
      }
      ranking.sort((a, b) => b.attendanceRate - a.attendanceRate)
      studentRanking.value = ranking
    } finally {
      isLoading.value = false
    }
  }

  // 加载经营统计
  async function loadBusinessStats() {
    isLoading.value = true
    try {
      // 近6月收入
      const months: string[] = []
      const values: number[] = []
      const now = dayjs()
      for (let i = 5; i >= 0; i--) {
        const m = now.subtract(i, 'month')
        const yearMonth = m.format('YYYY-MM')
        months.push(m.format('M月'))
        const revenue = await purchaseRepo.getMonthlyRevenue(yearMonth)
        values.push(revenue)
      }
      revenueMonths.value = months
      revenueValues.value = values

      // 生命周期分布
      const allStudents = await studentRepo.getActiveStudents()
      const tagMap: Record<string, number> = { new: 0, active: 0, warning: 0, at_risk: 0 }
      for (const s of allStudents) {
        if (s.lifecycle_tag in tagMap && tagMap[s.lifecycle_tag] !== undefined) {
          tagMap[s.lifecycle_tag]!++
        }
      }
      const tagNames: Record<string, string> = { new: '新生', active: '活跃', warning: '预警', at_risk: '流失风险' }
      lifecycleDistribution.value = Object.entries(tagMap).map(([key, value]) => ({
        name: tagNames[key] || key,
        value,
      }))

      // 课时预警列表（预计耗尽日期最近的前10名）
      const threshold = await getWarningThreshold()
      const warningStudents = allStudents.filter(s => s.remaining_hours > 0 && s.remaining_hours <= threshold)
      const allAtRisk = allStudents.filter(s => s.remaining_hours === 0)

      // 计算每个学生的周均消耗和预计耗尽日期
      const fourWeeksAgo = dayjs().subtract(28, 'day').format('YYYY-MM-DD')
      const todayStr = dayjs().format('YYYY-MM-DD')
      const recentRecords = await attendanceRepo.getAttendanceByDateRange(fourWeeksAgo, todayStr)

      const warnings: HourWarningItem[] = []
      for (const s of [...warningStudents, ...allAtRisk]) {
        const studentRecent = recentRecords.filter(
          r => r.student_id === s.id && (r.status === 'present' || r.status === 'late')
        )
        const weeklyAvg = studentRecent.length / 4
        let depletionDate = '—'
        if (weeklyAvg > 0 && s.remaining_hours > 0) {
          const daysLeft = Math.ceil(s.remaining_hours / weeklyAvg * 7)
          depletionDate = dayjs().add(daysLeft, 'day').format('YYYY-MM-DD')
        } else if (s.remaining_hours === 0) {
          depletionDate = '已耗尽'
        }
        warnings.push({ student: s, weeklyAvg: Math.round(weeklyAvg * 10) / 10, depletionDate })
      }
      // 按耗尽日期排序（已耗尽排最前，然后按日期升序）
      warnings.sort((a, b) => {
        if (a.depletionDate === '已耗尽' && b.depletionDate !== '已耗尽') return -1
        if (a.depletionDate !== '已耗尽' && b.depletionDate === '已耗尽') return 1
        if (a.depletionDate === '—' && b.depletionDate !== '—') return 1
        if (a.depletionDate !== '—' && b.depletionDate === '—') return -1
        return a.depletionDate.localeCompare(b.depletionDate)
      })
      hourWarnings.value = warnings.slice(0, 10)

      // 续费转化：历史上 remaining_hours 曾为 0 的学生（当前为0或有续费记录）
      const allStudentsFull = await studentRepo.getActiveStudents()
      let renewedCount = 0
      let lostCount = 0
      for (const s of allStudentsFull) {
        // 判断条件：总购课时 > 初始购课时（说明有续费）且 remaining_hours 曾为 0
        // 简化判断：有多条 purchase 记录的视为续费过
        const purchases = await purchaseRepo.getPurchasesByStudent(s.id)
        if (purchases.length > 1) {
          // 有续费记录，检查是否曾消耗完
          const totalPurchased = purchases.reduce((sum, p) => sum + p.hours, 0)
          const consumed = totalPurchased - s.remaining_hours
          // 如果消耗量 >= 任意一次购课量，说明至少用完过一次
          const firstPurchase = purchases[purchases.length - 1] // 最早的购课（按date DESC排序）
          if (firstPurchase && consumed >= firstPurchase.hours) {
            renewedCount++
          }
        } else if (s.remaining_hours === 0) {
          lostCount++
        }
      }
      const total = renewedCount + lostCount
      renewalConversion.value = {
        renewed: renewedCount,
        lost: lostCount,
        rate: total > 0 ? Math.round(renewedCount / total * 100) : 0,
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    monthlyAttendanceRates,
    monthlyDays,
    statusDistribution,
    studentRanking,
    revenueMonths,
    revenueValues,
    lifecycleDistribution,
    hourWarnings,
    renewalConversion,
    isLoading,
    loadAttendanceStats,
    loadBusinessStats,
  }
})
