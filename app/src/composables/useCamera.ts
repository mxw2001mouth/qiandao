import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import dayjs from 'dayjs'
import { REQUIRE_NATIVE_RUNTIME } from '../config/runtimeMode'

function addWatermark(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(base64); return }

      ctx.drawImage(img, 0, 0)

      const text = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const fontSize = Math.max(18, Math.round(img.width * 0.034))
      const padding = Math.round(img.width * 0.025)

      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = fontSize * 0.15
      ctx.lineJoin = 'round'
      ctx.strokeText(text, padding, img.height - padding)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillText(text, padding, img.height - padding)

      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? base64)
    }

    img.onerror = () => resolve(base64)
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

function assertCameraAllowedInCurrentRuntime(): void {
  if (REQUIRE_NATIVE_RUNTIME && !Capacitor.isNativePlatform()) {
    throw new Error('Native runtime mode enabled. Browser mock camera is disabled.')
  }
}

export async function takeGroupPhoto(): Promise<string> {
  assertCameraAllowedInCurrentRuntime()

  if (!Capacitor.isNativePlatform()) {
    return 'mock://browser-photo'
  }

  const photo = await Camera.getPhoto({
    quality: 65,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    width: 1280,
    height: 960,
  })

  if (!photo.base64String) {
    throw new Error('Failed to capture photo: empty image data.')
  }

  const watermarked = await addWatermark(photo.base64String)

  const fileName = `photos/${dayjs().format('YYYY-MM-DD')}.jpg`
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: watermarked,
    directory: Directory.Data,
    recursive: true,
  })

  return savedFile.uri
}

export async function readPhoto(path: string): Promise<string | null> {
  if (REQUIRE_NATIVE_RUNTIME && !Capacitor.isNativePlatform()) {
    throw new Error('Native runtime mode enabled. Browser photo read fallback is disabled.')
  }

  if (!Capacitor.isNativePlatform()) return null

  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    })

    if (typeof result.data === 'string') {
      return `data:image/jpeg;base64,${result.data}`
    }

    return null
  } catch {
    return null
  }
}
