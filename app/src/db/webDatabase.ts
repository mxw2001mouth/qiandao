/**
 * 浏览器环境下的 in-memory SQLite (sql.js / WebAssembly)
 * 用途：npm run dev 时在浏览器预览，运行与真机完全相同的 SQL 逻辑
 */
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { CREATE_TABLES_SQL, SEED_DATA_SQL, TEST_SEED_SQL } from './schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null

export async function initWebDatabase(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  _db = new SQL.Database()

  for (const sql of CREATE_TABLES_SQL) _db.run(sql)
  for (const sql of SEED_DATA_SQL) _db.run(sql)
  for (const sql of TEST_SEED_SQL) _db.run(sql)
}

export function webQuery<T>(sql: string, params: unknown[] = []): T[] {
  if (!_db) return []
  try {
    const stmt = _db.prepare(sql)
    stmt.bind(params)
    const rows: T[] = []
    while (stmt.step()) rows.push(stmt.getAsObject() as T)
    stmt.free()
    return rows
  } catch {
    return []
  }
}

export function webRun(sql: string, params: unknown[] = []): { changes: number; lastId: number } {
  if (!_db) return { changes: 0, lastId: 0 }
  try {
    _db.run(sql, params)
    const changes = _db.getRowsModified() as number
    const res = _db.exec('SELECT last_insert_rowid()') as { values: unknown[][] }[]
    const lastId = (res[0]?.values[0]?.[0] as number) ?? 0
    return { changes, lastId }
  } catch {
    return { changes: 0, lastId: 0 }
  }
}

export function webExecuteSet(statements: { statement: string; values: unknown[] }[]): void {
  if (!_db) return
  for (const { statement, values } of statements) {
    try {
      _db.run(statement, values)
    } catch {
      // 忽略约束冲突等错误（与原生 SQLite 行为一致）
    }
  }
}
