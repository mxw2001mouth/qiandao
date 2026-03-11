// localStorage-based data engine replacing SQLite for Demo
const PREFIX = 'qiandao_demo_'

function getTableKey(table: string): string {
  return `${PREFIX}${table}`
}

function readData<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(getTableKey(table))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeData<T>(table: string, data: T[]): void {
  localStorage.setItem(getTableKey(table), JSON.stringify(data))
}

export const localStore = {
  getAll<T>(table: string): T[] {
    return readData<T>(table)
  },

  findById<T extends { id: number }>(table: string, id: number): T | null {
    return readData<T>(table).find(item => item.id === id) ?? null
  },

  findWhere<T>(table: string, predicate: (item: T) => boolean): T[] {
    return readData<T>(table).filter(predicate)
  },

  insert<T extends object>(table: string, data: T): T & { id: number } {
    const all = readData<T & { id: number }>(table)
    const id = all.length === 0 ? 1 : Math.max(...all.map(item => item.id)) + 1
    const item = { ...data, id } as T & { id: number }
    all.push(item)
    writeData(table, all)
    return item
  },

  update<T extends { id: number }>(table: string, id: number, partial: Partial<T>): void {
    const all = readData<T>(table)
    const idx = all.findIndex(item => item.id === id)
    if (idx !== -1) {
      all[idx] = { ...all[idx]!, ...partial }
      writeData(table, all)
    }
  },

  delete(table: string, id: number): void {
    const all = readData<{ id: number }>(table)
    writeData(table, all.filter(item => item.id !== id))
  },

  deleteWhere<T>(table: string, predicate: (item: T) => boolean): void {
    const all = readData<T>(table)
    writeData(table, all.filter(item => !predicate(item)))
  },

  getSetting(key: string): string | null {
    const settings = readData<{ id: number; key: string; value: string }>('settings')
    return settings.find(s => s.key === key)?.value ?? null
  },

  setSetting(key: string, value: string): void {
    const settings = readData<{ id: number; key: string; value: string }>('settings')
    const idx = settings.findIndex(s => s.key === key)
    if (idx !== -1) {
      settings[idx]!.value = value
      writeData('settings', settings)
    } else {
      const id = settings.length === 0 ? 1 : Math.max(...settings.map(s => s.id)) + 1
      settings.push({ id, key, value })
      writeData('settings', settings)
    }
  },

  isSeeded(): boolean {
    return readData('users').length > 0
  },

  exportAll(): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {}
    const tables = ['users', 'students', 'attendances', 'purchases', 'followup', 'settings', 'audit_log']
    for (const table of tables) {
      result[table] = readData(table)
    }
    return result
  },

  importAll(data: Record<string, unknown[]>): void {
    for (const [table, items] of Object.entries(data)) {
      writeData(table, items)
    }
  },
}
