type WebStatement = { statement: string; values: unknown[] }

function disabled(): never {
  throw new Error('webDatabase is disabled in native runtime mode.')
}

export async function initWebDatabase(): Promise<void> {
  disabled()
}

export function webQuery<T>(_sql: string, _params: unknown[] = []): T[] {
  disabled()
}

export function webRun(_sql: string, _params: unknown[] = []): { changes: number; lastId: number } {
  disabled()
}

export function webExecuteSet(_statements: WebStatement[]): void {
  disabled()
}

