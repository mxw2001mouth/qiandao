import os from 'node:os'

function pickLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const infos of Object.values(interfaces)) {
    if (!infos) continue
    for (const info of infos) {
      if (!info) continue
      if (info.family !== 'IPv4') continue
      if (info.internal) continue
      if (info.address.startsWith('169.254.')) continue
      return info.address
    }
  }
  return null
}

const ip = process.env.MOBILE_HOST_IP || pickLocalIp()
const port = process.env.MOBILE_PORT || '5173'

if (!ip) {
  console.error('[mobile-live:url] No LAN IPv4 found. Set MOBILE_HOST_IP manually.')
  process.exit(1)
}

console.log(`CAP_PROFILE=live`)
console.log(`CAP_SERVER_URL=http://${ip}:${port}`)
