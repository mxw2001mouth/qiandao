import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import dayjs from 'dayjs'

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

  // 保存到 app 私有目录
  const fileName = `photos/${dayjs().format('YYYY-MM-DD')}.jpg`
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: photo.base64String,
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
