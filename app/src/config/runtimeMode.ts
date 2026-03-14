import { Capacitor } from '@capacitor/core'

export const REQUIRE_NATIVE_RUNTIME = import.meta.env.VITE_REQUIRE_NATIVE === '1'
export const IS_NATIVE_PLATFORM = Capacitor.isNativePlatform()

export function assertNativeRuntime(): void {
  if (REQUIRE_NATIVE_RUNTIME && !IS_NATIVE_PLATFORM) {
    throw new Error('Native runtime required: browser preview is disabled in current mode.')
  }
}

