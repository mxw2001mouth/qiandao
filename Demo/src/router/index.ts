import { createRouter, createWebHistory } from 'vue-router'
import type { UserRole } from '../types'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: UserRole[]
    ownChrome?: boolean  // 页面自带 AppHeader + BottomNav，App.vue 不再重复渲染
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../pages/Login.vue'),
      meta: { title: '登录', requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/attendance/today'
    },
    // 签到模块
    {
      path: '/attendance/today',
      name: 'AttendanceToday',
      component: () => import('../pages/AttendanceToday.vue'),
      meta: { title: '今日签到', requiresAuth: true, roles: ['admin', 'teacher'], ownChrome: true }
    },
    {
      path: '/attendance/history',
      name: 'AttendanceHistory',
      component: () => import('../pages/AttendanceHistory.vue'),
      meta: { title: '签到记录', requiresAuth: true, roles: ['admin'], ownChrome: true }
    },
    {
      path: '/attendance/calendar',
      name: 'AttendanceCalendar',
      component: () => import('../pages/AttendanceCalendar.vue'),
      meta: { title: '出勤日历', requiresAuth: true, roles: ['admin', 'teacher'] }
    },
    // 学生模块
    {
      path: '/students',
      name: 'StudentList',
      component: () => import('../pages/StudentList.vue'),
      meta: { title: '学生管理', requiresAuth: true, roles: ['admin', 'teacher'] }
    },
    {
      path: '/students/add',
      name: 'StudentAdd',
      component: () => import('../pages/StudentForm.vue'),
      meta: { title: '添加学生', requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/students/:id/edit',
      name: 'StudentEdit',
      component: () => import('../pages/StudentForm.vue'),
      meta: { title: '编辑学生', requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/students/:id',
      name: 'StudentDetail',
      component: () => import('../pages/StudentDetail.vue'),
      meta: { title: '学生详情', requiresAuth: true, roles: ['admin', 'teacher'] }
    },
    // 续费模块
    {
      path: '/students/:id/purchase',
      name: 'PurchaseAdd',
      component: () => import('../pages/PurchaseForm.vue'),
      meta: { title: '续费', requiresAuth: true, roles: ['admin'] }
    },
    // 跟进模块
    {
      path: '/followup',
      name: 'FollowupList',
      component: () => import('../pages/FollowupList.vue'),
      meta: { title: '课时管理', requiresAuth: true, roles: ['admin', 'teacher'] }
    },
    // 统计模块
    {
      path: '/stats',
      redirect: '/stats/attendance'
    },
    {
      path: '/stats/attendance',
      name: 'StatsAttendance',
      component: () => import('../pages/StatsPage.vue'),
      meta: { title: '统计分析', requiresAuth: true, roles: ['admin', 'teacher'], ownChrome: true }
    },
    {
      path: '/stats/business',
      name: 'StatsBusiness',
      component: () => import('../pages/StatsPage.vue'),
      meta: { title: '统计分析', requiresAuth: true, roles: ['admin'], ownChrome: true }
    },
    // 数据管理
    {
      path: '/data/export',
      name: 'DataExport',
      component: () => import('../pages/DataExport.vue'),
      meta: { title: '数据导出', requiresAuth: true, roles: ['admin'], ownChrome: true }
    },
    {
      path: '/data/backup',
      name: 'DataBackup',
      component: () => import('../pages/DataBackup.vue'),
      meta: { title: '数据备份', requiresAuth: true, roles: ['admin'], ownChrome: true }
    },
    // 设置
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../pages/Settings.vue'),
      meta: { title: '设置', requiresAuth: true, roles: ['admin'] }
    },
  ]
})

// 路由守卫：认证与权限检查
router.beforeEach((to) => {
  const authData = localStorage.getItem('auth_role')
  const isLoggedIn = !!authData

  // 需要认证但未登录
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'Login' }
  }

  // 已登录访问登录页，跳转首页
  if (to.name === 'Login' && isLoggedIn) {
    return { path: '/attendance/today' }
  }

  // 角色权限检查
  if (to.meta.roles && authData) {
    if (!to.meta.roles.includes(authData as UserRole)) {
      return { path: '/attendance/today' }
    }
  }

  return true
})

export default router
