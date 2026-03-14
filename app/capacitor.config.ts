import type { CapacitorConfig } from '@capacitor/cli'

const profile = process.env.CAP_PROFILE?.trim() || 'bundle'
const liveServerUrl = process.env.CAP_SERVER_URL?.trim()
const isLiveProfile = profile === 'live'

let liveServerHost: string | undefined
if (liveServerUrl) {
  try {
    liveServerHost = new URL(liveServerUrl).host
  } catch {
    throw new Error(`[capacitor.config] CAP_SERVER_URL is invalid: ${liveServerUrl}`)
  }
}

const config: CapacitorConfig = {
  appId: 'com.qiandao.app',
  appName: '签到管理',
  webDir: 'dist',
  server: {
    // bundle profile: use packaged dist assets
    // live profile: use dev server for real-device hot reload
    androidScheme: isLiveProfile ? 'http' : 'https',
    cleartext: isLiveProfile,
    ...(isLiveProfile && liveServerUrl
      ? {
          url: liveServerUrl,
          allowNavigation: liveServerHost ? [liveServerHost] : undefined,
        }
      : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#6366F1',
      showSpinner: false,
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
}

export default config
