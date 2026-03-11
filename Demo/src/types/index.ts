// 用户角色
export type UserRole = 'admin' | 'teacher'

// 学生状态
export type StudentStatus = 'active' | 'archived'

// 签到状态
export type AttendanceStatus = 'present' | 'late' | 'leave' | 'absent'

// 跟进状态
export type FollowupStatus = 'pending' | 'contacted' | 'renewed'

// 生命周期标签
export type LifecycleTag = 'new' | 'active' | 'warning' | 'at_risk'

// 用户
export interface User {
  id: number
  role: UserRole
  pin: string
  name: string
}

// 学生
export interface Student {
  id: number
  name: string
  class_name: string
  parent_name: string
  parent_phone: string
  remaining_hours: number
  total_hours: number
  status: StudentStatus
  lifecycle_tag: LifecycleTag
  created_at: string
}

// 签到记录
export interface Attendance {
  id: number
  student_id: number
  date: string
  status: AttendanceStatus
  notes: string
  photo_path: string
  created_by: number
  modified_at: string
  original_status: string
}

// 购课/续费记录
export interface Purchase {
  id: number
  student_id: number
  date: string
  hours: number
  amount: number
  notes: string
}

// 跟进记录
export interface Followup {
  id: number
  student_id: number
  status: FollowupStatus
  notes: string
  updated_at: string
}

// 系统设置
export interface Settings {
  key: string
  value: string
}

// 审计日志
export interface AuditLog {
  id: number
  table_name: string
  record_id: number
  action: string
  old_value: string
  new_value: string
  operator: string
  created_at: string
}
