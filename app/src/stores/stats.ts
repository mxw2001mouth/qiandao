import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import type { Student, Attendance } from '../types'
import * as attendanceRepo from '../db/repositories/attendanceRepository'
import * as purchaseRepo from '../db/repositories/purchaseRepository'
import * as studentRepo from '../db/repositories/studentRepository'
import { getWarningThreshold } from '../db/repositories/settingsRepository'

export interface StudentAttendanceRank {
  student: Student
  attendanceRate: number
  presentCount: number
  lateCount: number
  leaveCount: number
}

export interface HourWarningItem {
  student: Student
  weeklyAvg: number
  depletionDate: string
}

export interface RenewalConversion {
  renewed: number
  lost: number
  rate: number
}

export const useStatsStore = defineStore('stats', () => {
  // === 出勤统计 ===
  const monthlyAttendanceRates = ref<number[]>([])
  const monthlyDays = ref<string[]>([])
  const statusDistribution = ref<{ present: number; late: number; leave: number }>({
    present: 0,
    late: 0,
    leave: 0,
  })
  const studentRanking = ref<StudentAttendanceRank[]>([])

  // === 经营统计 ===
  const revenueMonths = ref<string[]>([])
  const revenueValues = ref<number[]>([])
  const lifecycleDistribution = ref<{ name: string; value: number }[]>([])
  const hourWarnings = ref<HourWarningItem[]>([])
  const renewalConversion = ref<RenewalConversion>({ renewed: 0, lost: 0, rate: 0 })

  const isLoading = ref(false)

  // 口径：迟到计入出勤，请假从应出勤中扣除
  async function loadAttendanceStats(year: number, month: number) {
    isLoading.value = true
    try {
      const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
      const endDate = startDate.endOf('month')
      const daysInMonth = endDate.date()
      const startStr = startDate.format('YYYY-MM-DD')
      const endStr = endDate.format('YYYY-MM-DD')

      const records = await attendanceRepo.getAttendanceByDateRange(startStr, endStr)
      const activeStudents = await studentRepo.getActiveStudents()

      const dayMap = new Map<string, Attendance[]>()
      for (const r of records) {
        const list = dayMap.get(r.date) || []
        list.push(r)
        dayMap.set(r.date, list)
      }

      const classDateSet = new Set<string>()
      for (const r of records) classDateSet.add(r.date)
      const classDates = Array.from(classDateSet).sort((a, b) => a.localeCompare(b))

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
        const leave = dayRecords.filter(r => r.status === 'leave' || r.status === 'absent').length
        const shouldAttend = Math.max(activeStudents.length - leave, 0)
        const attended = present + late
        const rate = shouldAttend > 0 ? Math.round((attended / shouldAttend) * 100) : 0
        rates.push(Math.min(rate, 100))
      }
      monthlyDays.value = days
      monthlyAttendanceRates.value = rates

      let pCount = 0
      let lCount = 0
      let lvCount = 0
      for (const r of records) {
        if (r.status === 'present') pCount++
        else if (r.status === 'late') lCount++
        else if (r.status === 'leave' || r.status === 'absent') lvCount++
      }
      statusDistribution.value = { present: pCount, late: lCount, leave: lvCount }

      const ranking: StudentAttendanceRank[] = []
      for (const student of activeStudents) {
        const studentRecords = records.filter(r => r.student_id === student.id)
        const presentCount = studentRecords.filter(r => r.status === 'present').length
        const lateCount = studentRecords.filter(r => r.status === 'late').length
        const leaveCount = studentRecords.filter(r => r.status === 'leave' || r.status === 'absent').length

        // 应出勤：当月实际上课日，且不早于学生入学日期
        const enrolledDate = student.created_at?.substring(0, 10) || '0000-01-01'
        const shouldAttendBase = classDates.filter(d => d >= enrolledDate).length
        // 排行口径：迟到计入出勤；请假不计出勤（不从应出勤分母扣除）
        const shouldAttend = Math.max(shouldAttendBase, 0)
        const attended = presentCount + lateCount
        const rate = shouldAttend > 0 ? Math.round((attended / shouldAttend) * 100) : 0

        ranking.push({
          student,
          attendanceRate: Math.min(rate, 100),
          presentCount,
          lateCount,
          leaveCount,
        })
      }

      ranking.sort((a, b) => b.attendanceRate - a.attendanceRate)
      studentRanking.value = ranking
    } finally {
      isLoading.value = false
    }
  }

  async function loadBusinessStats() {
    isLoading.value = true
    try {
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

      const allStudents = await studentRepo.getActiveStudents()
      const tagMap: Record<string, number> = { new: 0, active: 0, warning: 0, at_risk: 0 }
      for (const s of allStudents) {
        if (s.lifecycle_tag in tagMap && tagMap[s.lifecycle_tag] !== undefined) {
          tagMap[s.lifecycle_tag]!++
        }
      }
      const tagNames: Record<string, string> = {
        new: '新生',
        active: '活跃',
        warning: '预警',
        at_risk: '流失风险',
      }
      lifecycleDistribution.value = Object.entries(tagMap).map(([key, value]) => ({
        name: tagNames[key] || key,
        value,
      }))

      const threshold = await getWarningThreshold()
      const warningStudents = allStudents.filter(s => s.remaining_hours > 0 && s.remaining_hours <= threshold)
      const allAtRisk = allStudents.filter(s => s.remaining_hours === 0)

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
          const daysLeft = Math.ceil((s.remaining_hours / weeklyAvg) * 7)
          depletionDate = dayjs().add(daysLeft, 'day').format('YYYY-MM-DD')
        } else if (s.remaining_hours === 0) {
          depletionDate = '已耗尽'
        }
        warnings.push({ student: s, weeklyAvg: Math.round(weeklyAvg * 10) / 10, depletionDate })
      }

      warnings.sort((a, b) => {
        if (a.depletionDate === '已耗尽' && b.depletionDate !== '已耗尽') return -1
        if (a.depletionDate !== '已耗尽' && b.depletionDate === '已耗尽') return 1
        if (a.depletionDate === '—' && b.depletionDate !== '—') return 1
        if (a.depletionDate !== '—' && b.depletionDate === '—') return -1
        return a.depletionDate.localeCompare(b.depletionDate)
      })
      hourWarnings.value = warnings.slice(0, 10)

      const allStudentsFull = await studentRepo.getActiveStudents()
      let renewedCount = 0
      let lostCount = 0
      for (const s of allStudentsFull) {
        const purchases = await purchaseRepo.getPurchasesByStudent(s.id)
        if (purchases.length > 1) {
          const totalPurchased = purchases.reduce((sum, p) => sum + p.hours, 0)
          const consumed = totalPurchased - s.remaining_hours
          const firstPurchase = purchases[purchases.length - 1]
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
        rate: total > 0 ? Math.round((renewedCount / total) * 100) : 0,
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
