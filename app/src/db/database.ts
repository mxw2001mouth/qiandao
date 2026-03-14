import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { CREATE_TABLES_SQL, SEED_DATA_SQL, TEST_SEED_SQL } from './schema'
import { REQUIRE_NATIVE_RUNTIME } from '../config/runtimeMode'

const DB_NAME = 'qiandao_db'

type WebDbModule = {
  initWebDatabase: () => Promise<void>
  webQuery: <T>(sql: string, params?: unknown[]) => T[]
  webRun: (sql: string, params?: unknown[]) => { changes: number; lastId: number }
  webExecuteSet: (statements: { statement: string; values: unknown[] }[]) => void
}

let webDbModulePromise: Promise<WebDbModule> | null = null

async function loadWebDbModule(): Promise<WebDbModule> {
  if (REQUIRE_NATIVE_RUNTIME) {
    throw new Error('Web database module is disabled in native runtime mode.')
  }
  if (!webDbModulePromise) {
    webDbModulePromise = import('./webDatabase')
  }
  return webDbModulePromise
}

class Database {
  private sqlite: SQLiteConnection
  private db: SQLiteDBConnection | null = null
  private initialized = false

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite)
  }

  private ensureWebFallbackAllowed(): void {
    if (REQUIRE_NATIVE_RUNTIME && !Capacitor.isNativePlatform()) {
      throw new Error('Native SQLite mode is enabled. Browser fallback has been blocked.')
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return

    this.ensureWebFallbackAllowed()

    if (!Capacitor.isNativePlatform()) {
      const { initWebDatabase } = await loadWebDbModule()
      await initWebDatabase()
      this.initialized = true
      return
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

  private async createTables(): Promise<void> {
    for (const sql of CREATE_TABLES_SQL) {
      await this.getDb().execute(sql)
    }
  }

  private async seedData(): Promise<void> {
    const result = await this.getDb().query('SELECT COUNT(*) as count FROM users')
    if (result.values && result.values[0] && result.values[0].count > 0) {
      return
    }

    for (const sql of SEED_DATA_SQL) {
      await this.getDb().execute(sql)
    }

    for (const sql of TEST_SEED_SQL) {
      await this.getDb().execute(sql)
    }
  }

  getDb(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureWebFallbackAllowed()

    if (!Capacitor.isNativePlatform()) {
      const { webQuery } = await loadWebDbModule()
      return webQuery<T>(sql, params ?? [])
    }

    const result = await this.getDb().query(sql, params as unknown[])
    return (result.values || []) as T[]
  }

  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastId: number }> {
    this.ensureWebFallbackAllowed()

    if (!Capacitor.isNativePlatform()) {
      const { webRun } = await loadWebDbModule()
      return webRun(sql, params ?? [])
    }

    const result = await this.getDb().run(sql, params as unknown[])
    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId ?? 0,
    }
  }

  async executeSet(statements: { statement: string; values: unknown[] }[]): Promise<void> {
    this.ensureWebFallbackAllowed()

    if (!Capacitor.isNativePlatform()) {
      const { webExecuteSet } = await loadWebDbModule()
      webExecuteSet(statements)
      return
    }

    await this.getDb().executeSet(statements as never)
  }

  async importJson(jsonString: string): Promise<void> {
    await this.sqlite.importFromJson(jsonString)
  }

  getSqliteConnection(): SQLiteConnection {
    return this.sqlite
  }

  async close(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    if (this.db) {
      await this.db.close()
      await this.sqlite.closeConnection(DB_NAME, false)
      this.db = null
      this.initialized = false
    }
  }
}

export const database = new Database()
