import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { database } from '../db/database'
import { getSetting, setSetting } from '../db/repositories/settingsRepository'
import dayjs from 'dayjs'

const BACKUP_DIR = 'QiandaoBackup'

// 备份数据库到 Documents 目录
export async function backupDatabase(): Promise<string> {
  const timestamp = dayjs().format('YYYYMMDD_HHmmss')
  const fileName = `backup_${timestamp}.db`
  const destPath = `${BACKUP_DIR}/${fileName}`

  // 导出数据库为 JSON（@capacitor-community/sqlite 的导出方式）
  const db = database.getDb()
  const exportData = await db.exportToJson('full')

  // 确保目录存在
  try {
    await Filesystem.mkdir({
      path: BACKUP_DIR,
      directory: Directory.Documents,
      recursive: true,
    })
  } catch {
    // 目录可能已存在
  }

  // 写入备份文件
  await Filesystem.writeFile({
    path: destPath,
    data: JSON.stringify(exportData.export),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })

  // 记录备份时间
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await setSetting('last_backup_time', now)

  return destPath
}

// 从备份文件恢复数据库
export async function restoreDatabase(filePath: string): Promise<void> {
  // 读取备份文件
  const result = await Filesystem.readFile({
    path: filePath,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })

  const jsonData = JSON.parse(result.data as string)

  // 关闭当前连接（importFromJson 要求连接已关闭）
  await database.close()

  // 先导入备份数据，再重新初始化连接
  await database.importJson(JSON.stringify(jsonData))
  await database.init()
}

// 获取上次备份时间
export async function getLastBackupTime(): Promise<string | null> {
  return getSetting('last_backup_time')
}

// 计算距上次备份的天数
export async function getDaysSinceBackup(): Promise<number | null> {
  const lastTime = await getLastBackupTime()
  if (!lastTime) return null
  return dayjs().diff(dayjs(lastTime), 'day')
}

// 列出所有备份文件
export async function listBackups(): Promise<string[]> {
  try {
    const result = await Filesystem.readdir({
      path: BACKUP_DIR,
      directory: Directory.Documents,
    })
    return result.files
      .filter(f => f.name.endsWith('.db'))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(f => `${BACKUP_DIR}/${f.name}`)
  } catch {
    return []
  }
}
