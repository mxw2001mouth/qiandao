import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import dayjs from 'dayjs'

// 在图片上叠加日期时间水印
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
      // 先画半透明黑色描边，再画白色文字，确保在各种背景下可读
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = fontSize * 0.15
      ctx.lineJoin = 'round'
      ctx.strokeText(text, padding, img.height - padding)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillText(text, padding, img.height - padding)

      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? base64)
    }
    img.onerror = () => resolve(base64) // 降级：保存原图
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

// 拍摄合影并保存到本地
export async function takeGroupPhoto(): Promise<string> {
  const photo = await Camera.getPhoto({
    quality: 65,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    width: 1280,
    height: 960,
  })

  if (!photo.base64String) {
    throw new Error('拍照失败：未获取到图片数据')
  }

  const watermarked = await addWatermark(photo.base64String)

  // 保存到 app 私有目录
  const fileName = `photos/${dayjs().format('YYYY-MM-DD')}.jpg`
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: watermarked,
    directory: Directory.Data,
    recursive: true,
  })

  return savedFile.uri
}

// 读取照片（返回 base64 data URI）
export async function readPhoto(path: string): Promise<string | null> {
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
