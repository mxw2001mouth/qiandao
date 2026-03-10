import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { CREATE_TABLES_SQL, SEED_DATA_SQL, TEST_SEED_SQL } from './schema'

const DB_NAME = 'qiandao_db'

class Database {
  private sqlite: SQLiteConnection
  private db: SQLiteDBConnection | null = null
  private initialized = false

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite)
  }

  // 初始化数据库连接
  async init(): Promise<void> {
    if (this.initialized) return

    const platform = Capacitor.getPlatform()

    // Web 平台需要使用 jeep-sqlite
    if (platform === 'web') {
      const jeepEl = document.querySelector('jeep-sqlite')
      if (!jeepEl) {
        const el = document.createElement('jeep-sqlite')
        document.body.appendChild(el)
        await customElements.whenDefined('jeep-sqlite')
      }
      await this.sqlite.initWebStore()
    }

    const ret = await this.sqlite.checkConnectionsConsistency()
    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result

    if (ret.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false)
    } else {
      this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    }

    await this.db.open()
    await this.createTables()
    await this.seedData()
    this.initialized = true
  }

  // 创建数据表
  private async createTables(): Promise<void> {
    for (const sql of CREATE_TABLES_SQL) {
      await this.getDb().execute(sql)
    }
  }

  // 插入初始数据
  private async seedData(): Promise<void> {
    // 检查是否已有用户数据，有则跳过（避免重复插入）
    const result = await this.getDb().query('SELECT COUNT(*) as count FROM users')
    if (result.values && result.values[0] && result.values[0].count > 0) {
      return
    }
    // 写入账号与系统配置
    for (const sql of SEED_DATA_SQL) {
      await this.getDb().execute(sql)
    }
    // 写入测试数据（15名学生 + 10次课签到 + 购课记录 + 跟进记录）
    for (const sql of TEST_SEED_SQL) {
      await this.getDb().execute(sql)
    }
  }

  // 获取数据库连接
  getDb(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('数据库未初始化，请先调用 init()')
    }
    return this.db
  }

  // 执行查询，返回结果数组
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.getDb().query(sql, params as unknown[])
    return (result.values || []) as T[]
  }

  // 执行写操作（INSERT/UPDATE/DELETE）
  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastId: number }> {
    const result = await this.getDb().run(sql, params as unknown[])
    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId ?? 0
    }
  }

  // 执行多条 SQL（事务）
  async executeSet(statements: { statement: string; values: unknown[] }[]): Promise<void> {
    await this.getDb().executeSet(statements as never)
  }

  // 导入 JSON 数据（用于恢复备份）
  async importJson(jsonString: string): Promise<void> {
    await this.sqlite.importFromJson(jsonString)
  }

  // 获取 SQLiteConnection（用于高级操作）
  getSqliteConnection(): SQLiteConnection {
    return this.sqlite
  }

  // 关闭连接
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      await this.sqlite.closeConnection(DB_NAME, false)
      this.db = null
      this.initialized = false
    }
  }
}

// 单例导出
export const database = new Database()
