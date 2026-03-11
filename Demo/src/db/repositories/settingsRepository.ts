import { localStore } from '../localStore'

export async function getSetting(key: string): Promise<string | null> {
  return localStore.getSetting(key)
}

export async function setSetting(key: string, value: string): Promise<void> {
  localStore.setSetting(key, value)
}

export async function getWarningThreshold(): Promise<number> {
  const value = localStore.getSetting('warning_threshold')
  return value ? parseInt(value, 10) : 3
}

export async function setWarningThreshold(threshold: number): Promise<void> {
  localStore.setSetting('warning_threshold', String(threshold))
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = localStore.getAll<{ key: string; value: string }>('settings')
  const result: Record<string, string> = {}
  for (const s of settings) {
    result[s.key] = s.value
  }
  return result
}
