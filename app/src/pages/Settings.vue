<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Shield, Bell, Database, FileText, ChevronRight, Plus, Trash2, PencilLine } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import {
  getWarningThreshold,
  setWarningThreshold,
  getClassCatalog,
  createClass,
  renameClass,
  deleteClass,
  getRoleClassScope,
  setRoleVisibleClasses,
  setRoleDefaultClass,
} from '../db/repositories/settingsRepository'
import { updatePin } from '../db/repositories/userRepository'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import { APP_NAME, APP_VERSION, AUTHOR_NAME, AUTHOR_CONTACT } from '../constants/appMeta'

type RoleKey = 'admin' | 'teacher'

const router = useRouter()
const auth = useAuthStore()

// 预警阈值
const threshold = ref('3')
const thresholdSaving = ref(false)

// PIN 修改
const showPinModal = ref(false)
const newPin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const pinSaving = ref(false)

// 班级目录管理（管理员）
const classCatalog = ref<string[]>([])
const newClassName = ref('')
const renameFrom = ref('')
const renameTo = ref('')
const classSaving = ref(false)
const classError = ref('')
const classSuccess = ref('')

// 角色可见范围与默认班级
const visibleClassesAdmin = ref<string[]>([])
const visibleClassesTeacher = ref<string[]>([])
const defaultClassAdmin = ref('')
const defaultClassTeacher = ref('')
const scopeSaving = ref(false)
const scopeError = ref('')
const scopeSuccess = ref('')

// 老师个人默认班级
const myDefaultSaving = ref(false)
const myDefaultError = ref('')
const myDefaultSuccess = ref('')

const myVisibleClasses = computed(() => {
  return auth.isAdmin ? visibleClassesAdmin.value : visibleClassesTeacher.value
})

const myDefaultClass = computed({
  get() {
    return auth.isAdmin ? defaultClassAdmin.value : defaultClassTeacher.value
  },
  set(value: string) {
    if (auth.isAdmin) {
      defaultClassAdmin.value = value
    } else {
      defaultClassTeacher.value = value
    }
  },
})

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function roleLabel(role: RoleKey): string {
  return role === 'admin' ? '管理员' : '老师'
}

function getVisibleByRole(role: RoleKey): string[] {
  return role === 'admin' ? visibleClassesAdmin.value : visibleClassesTeacher.value
}

function setVisibleByRole(role: RoleKey, classes: string[]) {
  if (role === 'admin') {
    visibleClassesAdmin.value = classes
  } else {
    visibleClassesTeacher.value = classes
  }
}

function getDefaultByRole(role: RoleKey): string {
  return role === 'admin' ? defaultClassAdmin.value : defaultClassTeacher.value
}

function setDefaultByRole(role: RoleKey, className: string) {
  if (role === 'admin') {
    defaultClassAdmin.value = className
  } else {
    defaultClassTeacher.value = className
  }
}

function normalizeAndSortClasses(classes: string[]): string[] {
  return Array.from(new Set(classes.map(c => c.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function clampDefaultClass(role: RoleKey): string {
  const visible = getVisibleByRole(role)
  const current = getDefaultByRole(role)
  if (current && visible.includes(current)) return ''

  const fallback = visible[0] ?? ''
  setDefaultByRole(role, fallback)
  return fallback ? `${roleLabel(role)}默认班级已自动调整为“${fallback}”` : `${roleLabel(role)}默认班级已清空`
}

function onToggleRoleClass(role: RoleKey, className: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const current = getVisibleByRole(role)

  if (checked) {
    setVisibleByRole(role, normalizeAndSortClasses([...current, className]))
    return
  }

  setVisibleByRole(role, current.filter(item => item !== className))
  if (getDefaultByRole(role) === className) {
    setDefaultByRole(role, '')
  }
}

async function loadClassSettings() {
  classCatalog.value = await getClassCatalog()

  const adminScope = await getRoleClassScope('admin')
  visibleClassesAdmin.value = adminScope.visibleClasses
  defaultClassAdmin.value = adminScope.defaultClass

  const teacherScope = await getRoleClassScope('teacher')
  visibleClassesTeacher.value = teacherScope.visibleClasses
  defaultClassTeacher.value = teacherScope.defaultClass
}

onMounted(async () => {
  try {
    const val = await getWarningThreshold()
    threshold.value = String(val)
  } catch {
    // 默认值
  }

  try {
    await loadClassSettings()
  } catch {
    // 设置页局部失败不阻断其他功能
  }
})

async function saveThreshold() {
  const val = Number(threshold.value)
  if (val <= 0 || isNaN(val)) return
  thresholdSaving.value = true
  try {
    await setWarningThreshold(val)
  } catch {
    // 错误处理
  } finally {
    thresholdSaving.value = false
  }
}

function openPinModal() {
  newPin.value = ''
  confirmPin.value = ''
  pinError.value = ''
  showPinModal.value = true
}

async function savePin() {
  if (newPin.value.length < 4) {
    pinError.value = 'PIN 码至少4位'
    return
  }
  if (newPin.value !== confirmPin.value) {
    pinError.value = '两次输入不一致'
    return
  }
  pinSaving.value = true
  try {
    await updatePin(auth.userId!, newPin.value)
    showPinModal.value = false
  } catch {
    pinError.value = '保存失败'
  } finally {
    pinSaving.value = false
  }
}

async function addClassItem() {
  classError.value = ''
  classSuccess.value = ''
  classSaving.value = true
  try {
    await createClass(newClassName.value)
    newClassName.value = ''
    await loadClassSettings()
    classSuccess.value = '班级已新增'
  } catch (error) {
    classError.value = toMessage(error, '新增班级失败')
  } finally {
    classSaving.value = false
  }
}

async function renameClassItem() {
  classError.value = ''
  classSuccess.value = ''
  classSaving.value = true
  try {
    await renameClass(renameFrom.value, renameTo.value)
    renameFrom.value = ''
    renameTo.value = ''
    await loadClassSettings()
    classSuccess.value = '班级已重命名'
  } catch (error) {
    classError.value = toMessage(error, '重命名班级失败')
  } finally {
    classSaving.value = false
  }
}

async function removeClassItem(className: string) {
  classError.value = ''
  classSuccess.value = ''
  const ok = window.confirm(`确认删除班级“${className}”？`)
  if (!ok) return

  classSaving.value = true
  try {
    await deleteClass(className)
    await loadClassSettings()
    classSuccess.value = '班级已删除'
  } catch (error) {
    classError.value = toMessage(error, '删除班级失败')
  } finally {
    classSaving.value = false
  }
}

async function saveRoleScopes() {
  scopeError.value = ''
  scopeSuccess.value = ''
  scopeSaving.value = true
  try {
    const notices = [clampDefaultClass('admin'), clampDefaultClass('teacher')].filter(Boolean)

    await setRoleVisibleClasses('admin', visibleClassesAdmin.value)
    await setRoleVisibleClasses('teacher', visibleClassesTeacher.value)
    await setRoleDefaultClass('admin', defaultClassAdmin.value)
    await setRoleDefaultClass('teacher', defaultClassTeacher.value)

    await loadClassSettings()
    scopeSuccess.value = notices.length > 0 ? notices.join('；') : '班级可见范围与默认班级已保存'
  } catch (error) {
    scopeError.value = toMessage(error, '保存班级范围失败')
  } finally {
    scopeSaving.value = false
  }
}

async function saveMyDefaultClass() {
  myDefaultError.value = ''
  myDefaultSuccess.value = ''

  if (auth.isAdmin) {
    myDefaultError.value = '管理员请在“班级可见范围”中统一保存默认班级'
    return
  }

  if (myVisibleClasses.value.length === 0) {
    myDefaultError.value = '当前未分配可见班级，请联系管理员分配'
    return
  }

  myDefaultSaving.value = true
  try {
    await setRoleDefaultClass('teacher', defaultClassTeacher.value)
    await loadClassSettings()
    myDefaultSuccess.value = '默认班级已保存'
  } catch (error) {
    myDefaultError.value = toMessage(error, '保存默认班级失败')
  } finally {
    myDefaultSaving.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.replace('/login')
}

function goToExport() {
  router.push('/data/export')
}

function goToBackup() {
  router.push('/data/backup')
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 用户信息 -->
    <AppCard>
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center">
          <span class="text-white font-bold text-lg">{{ auth.userName?.slice(-1) }}</span>
        </div>
        <div>
          <div class="font-bold text-slate-800">{{ auth.userName }}</div>
          <div class="text-sm text-slate-400">{{ auth.isAdmin ? '管理员' : '老师' }}</div>
        </div>
      </div>
    </AppCard>

    <!-- 预警设置（管理员） -->
    <AppCard v-if="auth.isAdmin">
      <div class="flex items-center gap-2 mb-3">
        <Bell class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">课时预警</h3>
      </div>
      <div class="flex items-end gap-3">
        <AppInput
          v-model="threshold"
          label="预警阈值（课时）"
          type="number"
          placeholder="3"
          class="flex-1"
        />
        <AppButton size="sm" :loading="thresholdSaving" @click="saveThreshold">
          保存
        </AppButton>
      </div>
      <p class="text-xs text-slate-400 mt-2">当学生剩余课时 &le; 此值时显示黄色预警</p>
    </AppCard>

    <!-- 班级管理（管理员） -->
    <AppCard v-if="auth.isAdmin">
      <div class="flex items-center gap-2 mb-3">
        <Database class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">班级管理</h3>
      </div>

      <div class="space-y-3">
        <div class="flex gap-2">
          <AppInput
            v-model="newClassName"
            label="新增班级"
            placeholder="例如：英语A班"
            class="flex-1"
          />
          <AppButton size="sm" :loading="classSaving" @click="addClassItem">
            <Plus class="w-4 h-4 mr-1" />
            新增
          </AppButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">重命名原班级</label>
            <select
              v-model="renameFrom"
              class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">请选择班级</option>
              <option v-for="className in classCatalog" :key="className" :value="className">
                {{ className }}
              </option>
            </select>
          </div>
          <AppInput
            v-model="renameTo"
            label="新班级名称"
            placeholder="输入新名称"
          />
          <AppButton size="sm" :loading="classSaving" @click="renameClassItem">
            <PencilLine class="w-4 h-4 mr-1" />
            重命名
          </AppButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="className in classCatalog"
            :key="className"
            class="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
          >
            <span class="text-sm text-slate-700">{{ className }}</span>
            <button
              class="h-11 px-3 text-red-500 text-xs rounded-xl flex items-center gap-1 active:bg-red-50 disabled:text-slate-300"
              :disabled="classSaving"
              @click="removeClassItem(className)"
            >
              <Trash2 class="w-3.5 h-3.5" />
              删除
            </button>
          </div>
          <p v-if="classCatalog.length === 0" class="text-xs text-slate-500">暂无班级，请先新增班级</p>
        </div>

        <p class="text-xs text-slate-400">删除规则：若班级下有关联学生，将禁止删除。</p>
        <p v-if="classError" class="text-xs text-red-500">{{ classError }}</p>
        <p v-if="classSuccess" class="text-xs text-green-600">{{ classSuccess }}</p>
      </div>
    </AppCard>

    <!-- 班级可见范围（管理员） -->
    <AppCard v-if="auth.isAdmin">
      <div class="flex items-center gap-2 mb-3">
        <Database class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">班级可见范围</h3>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-700">管理员可见班级</p>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="className in classCatalog"
              :key="`admin-${className}`"
              class="text-sm text-slate-600 flex items-center gap-2"
            >
              <input
                type="checkbox"
                :checked="visibleClassesAdmin.includes(className)"
                @change="onToggleRoleClass('admin', className, $event)"
              />
              <span>{{ className }}</span>
            </label>
          </div>
          <p v-if="classCatalog.length === 0" class="text-xs text-slate-500">请先在班级管理中新增班级</p>
          <div>
            <label class="block text-xs text-slate-500 mb-1">管理员默认班级</label>
            <select
              v-model="defaultClassAdmin"
              class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">未设置（自动取首个可见班级）</option>
              <option v-for="className in visibleClassesAdmin" :key="`admin-default-${className}`" :value="className">
                {{ className }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-700">老师可见班级</p>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="className in classCatalog"
              :key="`teacher-${className}`"
              class="text-sm text-slate-600 flex items-center gap-2"
            >
              <input
                type="checkbox"
                :checked="visibleClassesTeacher.includes(className)"
                @change="onToggleRoleClass('teacher', className, $event)"
              />
              <span>{{ className }}</span>
            </label>
          </div>
          <p v-if="classCatalog.length === 0" class="text-xs text-slate-500">请先在班级管理中新增班级</p>
          <div>
            <label class="block text-xs text-slate-500 mb-1">老师默认班级（可代老师设置）</label>
            <select
              v-model="defaultClassTeacher"
              class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">未设置（自动取首个可见班级）</option>
              <option v-for="className in visibleClassesTeacher" :key="`teacher-default-${className}`" :value="className">
                {{ className }}
              </option>
            </select>
          </div>
        </div>

        <p v-if="scopeError" class="text-xs text-red-500">{{ scopeError }}</p>
        <p v-if="scopeSuccess" class="text-xs text-green-600">{{ scopeSuccess }}</p>

        <AppButton class="w-full" size="sm" :loading="scopeSaving" @click="saveRoleScopes">
          保存班级范围与默认班级
        </AppButton>
      </div>
    </AppCard>

    <!-- 个人默认班级（老师） -->
    <AppCard v-if="!auth.isAdmin">
      <div class="flex items-center gap-2 mb-3">
        <Database class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">我的默认班级</h3>
      </div>

      <div class="space-y-3">
        <div>
          <p class="text-xs text-slate-500 mb-2">已分配可见班级</p>
          <div v-if="myVisibleClasses.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="className in myVisibleClasses"
              :key="`my-${className}`"
              class="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600"
            >
              {{ className }}
            </span>
          </div>
          <p v-else class="text-xs text-amber-600">当前未分配可见班级，请联系管理员分配</p>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1">默认班级</label>
          <select
            v-model="myDefaultClass"
            class="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            :disabled="myVisibleClasses.length === 0"
          >
            <option value="">未设置（自动取首个可见班级）</option>
            <option v-for="className in myVisibleClasses" :key="`my-default-${className}`" :value="className">
              {{ className }}
            </option>
          </select>
        </div>

        <p v-if="myDefaultError" class="text-xs text-red-500">{{ myDefaultError }}</p>
        <p v-if="myDefaultSuccess" class="text-xs text-green-600">{{ myDefaultSuccess }}</p>

        <AppButton class="w-full" size="sm" :loading="myDefaultSaving" @click="saveMyDefaultClass">
          保存我的默认班级
        </AppButton>
      </div>
    </AppCard>

    <!-- 账号安全 -->
    <AppCard>
      <div class="flex items-center gap-2 mb-3">
        <Shield class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">账号安全</h3>
      </div>
      <button
        class="w-full flex items-center justify-between py-3 border-b border-slate-50"
        @click="openPinModal"
      >
        <span class="text-sm text-slate-700">修改 PIN 码</span>
        <ChevronRight class="w-4 h-4 text-slate-400" />
      </button>
    </AppCard>

    <!-- 数据管理（管理员） -->
    <AppCard v-if="auth.isAdmin">
      <div class="flex items-center gap-2 mb-3">
        <Database class="w-4 h-4 text-indigo-500" />
        <h3 class="font-bold text-slate-800">数据管理</h3>
      </div>
      <button
        class="w-full flex items-center justify-between py-3 border-b border-slate-50"
        @click="goToExport"
      >
        <div class="flex items-center gap-2">
          <FileText class="w-4 h-4 text-slate-500" />
          <span class="text-sm text-slate-700">导出数据</span>
        </div>
        <ChevronRight class="w-4 h-4 text-slate-400" />
      </button>
      <button
        class="w-full flex items-center justify-between py-3"
        @click="goToBackup"
      >
        <div class="flex items-center gap-2">
          <Database class="w-4 h-4 text-slate-500" />
          <span class="text-sm text-slate-700">备份与还原</span>
        </div>
        <ChevronRight class="w-4 h-4 text-slate-400" />
      </button>
    </AppCard>

    <!-- 退出登录 -->
    <AppCard>
      <div class="text-center text-xs text-slate-500 space-y-1">
        <p class="font-semibold text-slate-700">{{ APP_NAME }} {{ APP_VERSION }}</p>
        <p>作 者：{{ AUTHOR_NAME }}</p>
        <p>电 话：{{ AUTHOR_CONTACT }}</p>
        <p>培训机构学生签到与课时管理V1.0</p>
      </div>
    </AppCard>

    <AppButton variant="secondary" class="w-full" @click="handleLogout">
      <LogOut class="w-4 h-4 mr-2" />
      退出登录
    </AppButton>

    <!-- PIN 修改弹窗 -->
    <AppModal v-model:visible="showPinModal" title="修改 PIN 码">
      <div class="space-y-4">
        <AppInput
          v-model="newPin"
          label="新 PIN 码"
          placeholder="至少4位数字"
          type="password"
        />
        <AppInput
          v-model="confirmPin"
          label="确认 PIN 码"
          placeholder="再次输入"
          type="password"
          :error="pinError"
        />
        <div class="flex gap-3">
          <AppButton variant="secondary" size="sm" class="flex-1" @click="showPinModal = false">
            取消
          </AppButton>
          <AppButton size="sm" class="flex-1" :loading="pinSaving" @click="savePin">
            确认修改
          </AppButton>
        </div>
      </div>
    </AppModal>
  </div>
</template>
