import { localStore } from './localStore'
import dayjs from 'dayjs'

export function seedDemoData(): void {
  if (localStore.isSeeded()) return

  // ── Users ──
  localStore.insert('users', { role: 'admin', pin: '1234', name: '管理员' })
  localStore.insert('users', { role: 'teacher', pin: '5678', name: '老师' })

  // ── Settings ──
  localStore.setSetting('warning_threshold', '3')

  // ── Students (15 students, 3 classes) ──
  const old = dayjs().subtract(60, 'day').format('YYYY-MM-DD HH:mm:ss')
  const recent = dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss')
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  // 英语A班 (5 students)
  localStore.insert('students', { name: '张小明', class_name: '英语A班', parent_name: '张强', parent_phone: '13800001001', remaining_hours: 0, total_hours: 20, status: 'active', lifecycle_tag: 'at_risk', created_at: old })
  localStore.insert('students', { name: '李小红', class_name: '英语A班', parent_name: '李梅', parent_phone: '13800001002', remaining_hours: 2, total_hours: 20, status: 'active', lifecycle_tag: 'warning', created_at: old })
  localStore.insert('students', { name: '王小华', class_name: '英语A班', parent_name: '王刚', parent_phone: '13800001003', remaining_hours: 15, total_hours: 20, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '赵小亮', class_name: '英语A班', parent_name: '赵磊', parent_phone: '13800001004', remaining_hours: 8, total_hours: 20, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '孙小美', class_name: '英语A班', parent_name: '孙明', parent_phone: '13800001005', remaining_hours: 3, total_hours: 20, status: 'active', lifecycle_tag: 'warning', created_at: old })

  // 数学B班 (5 students)
  localStore.insert('students', { name: '周小军', class_name: '数学B班', parent_name: '周伟', parent_phone: '13800002001', remaining_hours: 0, total_hours: 30, status: 'active', lifecycle_tag: 'at_risk', created_at: old })
  localStore.insert('students', { name: '吴小芳', class_name: '数学B班', parent_name: '吴华', parent_phone: '13800002002', remaining_hours: 1, total_hours: 30, status: 'active', lifecycle_tag: 'warning', created_at: old })
  localStore.insert('students', { name: '郑小磊', class_name: '数学B班', parent_name: '郑东', parent_phone: '13800002003', remaining_hours: 12, total_hours: 30, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '陈小燕', class_name: '数学B班', parent_name: '陈芳', parent_phone: '13800002004', remaining_hours: 20, total_hours: 30, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '杨小龙', class_name: '数学B班', parent_name: '杨峰', parent_phone: '13800002005', remaining_hours: 25, total_hours: 30, status: 'active', lifecycle_tag: 'active', created_at: old })

  // 科学C班 (5 students)
  localStore.insert('students', { name: '黄小雨', class_name: '科学C班', parent_name: '黄勇', parent_phone: '13800003001', remaining_hours: 0, total_hours: 25, status: 'active', lifecycle_tag: 'at_risk', created_at: old })
  localStore.insert('students', { name: '徐小青', class_name: '科学C班', parent_name: '徐明', parent_phone: '13800003002', remaining_hours: 18, total_hours: 25, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '朱小虎', class_name: '科学C班', parent_name: '朱强', parent_phone: '13800003003', remaining_hours: 5, total_hours: 25, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '刘小丹', class_name: '科学C班', parent_name: '刘霞', parent_phone: '13800003004', remaining_hours: 22, total_hours: 25, status: 'active', lifecycle_tag: 'active', created_at: old })
  localStore.insert('students', { name: '新生小白', class_name: '科学C班', parent_name: '白云', parent_phone: '13800003005', remaining_hours: 20, total_hours: 20, status: 'active', lifecycle_tag: 'new', created_at: now })

  // ── Purchases (24 records, ~2 per month for 6 months) ──
  const base = dayjs().subtract(6, 'month')
  const purchaseData = [
    { student_id: 1, date: base.add(0, 'month').format('YYYY-MM-10'), hours: 20, amount: 2000, notes: '首次购课' },
    { student_id: 2, date: base.add(0, 'month').format('YYYY-MM-12'), hours: 20, amount: 2000, notes: '首次购课' },
    { student_id: 3, date: base.add(0, 'month').format('YYYY-MM-15'), hours: 20, amount: 2000, notes: '首次购课' },
    { student_id: 4, date: base.add(0, 'month').format('YYYY-MM-18'), hours: 20, amount: 2000, notes: '首次购课' },
    { student_id: 5, date: base.add(0, 'month').format('YYYY-MM-20'), hours: 20, amount: 2000, notes: '首次购课' },
    { student_id: 6, date: base.add(1, 'month').format('YYYY-MM-05'), hours: 30, amount: 2800, notes: '首次购课' },
    { student_id: 7, date: base.add(1, 'month').format('YYYY-MM-08'), hours: 30, amount: 2800, notes: '首次购课' },
    { student_id: 8, date: base.add(1, 'month').format('YYYY-MM-10'), hours: 30, amount: 2800, notes: '首次购课' },
    { student_id: 9, date: base.add(1, 'month').format('YYYY-MM-15'), hours: 30, amount: 2800, notes: '首次购课' },
    { student_id: 10, date: base.add(1, 'month').format('YYYY-MM-20'), hours: 30, amount: 2800, notes: '首次购课' },
    { student_id: 11, date: base.add(2, 'month').format('YYYY-MM-05'), hours: 25, amount: 2400, notes: '首次购课' },
    { student_id: 12, date: base.add(2, 'month').format('YYYY-MM-10'), hours: 25, amount: 2400, notes: '首次购课' },
    { student_id: 13, date: base.add(2, 'month').format('YYYY-MM-12'), hours: 25, amount: 2400, notes: '首次购课' },
    { student_id: 14, date: base.add(2, 'month').format('YYYY-MM-15'), hours: 25, amount: 2400, notes: '首次购课' },
    { student_id: 15, date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'), hours: 20, amount: 2000, notes: '首次购课' },
    // 续费记录
    { student_id: 3, date: base.add(3, 'month').format('YYYY-MM-10'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 4, date: base.add(3, 'month').format('YYYY-MM-15'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 8, date: base.add(3, 'month').format('YYYY-MM-20'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 9, date: base.add(4, 'month').format('YYYY-MM-05'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 10, date: base.add(4, 'month').format('YYYY-MM-10'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 12, date: base.add(4, 'month').format('YYYY-MM-12'), hours: 20, amount: 2000, notes: '续费' },
    { student_id: 13, date: base.add(5, 'month').format('YYYY-MM-08'), hours: 15, amount: 1500, notes: '续费' },
    { student_id: 14, date: base.add(5, 'month').format('YYYY-MM-12'), hours: 15, amount: 1500, notes: '续费' },
    { student_id: 3, date: base.add(5, 'month').format('YYYY-MM-20'), hours: 20, amount: 2000, notes: '续费' },
  ]
  for (const p of purchaseData) {
    localStore.insert('purchases', p)
  }

  // ── Attendances (150 records: 10 class dates × 15 students) ──
  // Generate last 10 Mon/Wed/Fri dates
  const classDates: string[] = []
  let d = dayjs().subtract(1, 'day')
  while (classDates.length < 10) {
    const dow = d.day() // 0=Sun, 1=Mon, 3=Wed, 5=Fri
    if (dow === 1 || dow === 3 || dow === 5) {
      classDates.unshift(d.format('YYYY-MM-DD'))
    }
    d = d.subtract(1, 'day')
  }

  // Status distribution per student (to make it realistic)
  const statusPatterns: ('present' | 'late' | 'leave' | 'absent')[][] = [
    ['present', 'present', 'absent', 'present', 'present', 'present', 'late', 'present', 'present', 'present'],
    ['present', 'leave', 'present', 'present', 'late', 'present', 'present', 'present', 'absent', 'present'],
    ['present', 'present', 'present', 'present', 'present', 'present', 'present', 'present', 'present', 'late'],
    ['late', 'present', 'present', 'absent', 'present', 'present', 'present', 'late', 'present', 'present'],
    ['present', 'present', 'leave', 'present', 'present', 'absent', 'present', 'present', 'late', 'present'],
    ['present', 'absent', 'present', 'present', 'leave', 'present', 'present', 'present', 'present', 'absent'],
    ['present', 'present', 'late', 'present', 'present', 'present', 'absent', 'present', 'present', 'present'],
    ['present', 'present', 'present', 'leave', 'present', 'present', 'present', 'late', 'present', 'present'],
    ['late', 'present', 'present', 'present', 'present', 'absent', 'present', 'present', 'present', 'present'],
    ['present', 'present', 'present', 'present', 'late', 'present', 'present', 'present', 'leave', 'present'],
    ['present', 'absent', 'present', 'present', 'present', 'leave', 'present', 'present', 'present', 'absent'],
    ['present', 'present', 'present', 'present', 'present', 'present', 'late', 'present', 'present', 'present'],
    ['present', 'leave', 'present', 'present', 'present', 'present', 'present', 'absent', 'present', 'present'],
    ['present', 'present', 'late', 'present', 'present', 'present', 'present', 'present', 'present', 'present'],
    ['present', 'present', 'present', 'late', 'present', 'present', 'present', 'present', 'present', 'present'],
  ]

  for (let studentIdx = 0; studentIdx < 15; studentIdx++) {
    const studentId = studentIdx + 1
    const patterns = statusPatterns[studentIdx]!
    for (let dateIdx = 0; dateIdx < classDates.length; dateIdx++) {
      const status = patterns[dateIdx]!
      const notes = status === 'leave' ? '家长请假' : status === 'absent' ? '' : ''
      localStore.insert('attendances', {
        student_id: studentId,
        date: classDates[dateIdx]!,
        status,
        notes,
        photo_path: '',
        created_by: 1,
        modified_at: '',
        original_status: '',
      })
    }
  }

  // ── Followups (6 records for at-risk/warning students) ──
  const followupData = [
    { student_id: 1, status: 'pending', notes: '课时已用完，需联系续费', updated_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss') },
    { student_id: 2, status: 'contacted', notes: '家长说本周来续费', updated_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss') },
    { student_id: 5, status: 'pending', notes: '', updated_at: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss') },
    { student_id: 6, status: 'pending', notes: '课时已用完', updated_at: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss') },
    { student_id: 7, status: 'contacted', notes: '已联系，说周六来续费', updated_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss') },
    { student_id: 11, status: 'pending', notes: '', updated_at: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss') },
  ]
  for (const f of followupData) {
    localStore.insert('followup', f)
  }

  void recent
}
