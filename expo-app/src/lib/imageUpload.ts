import { Platform } from 'react-native'
import { type Models } from 'react-native-appwrite'
import { apiClient } from './apiClient'

export type ImageSource = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
  fileSize?: number | null
  /** Web only: the picked `File`, when the picker provides one. */
  file?: Blob | null
}

type NativeFilePart = { uri: string; name: string; type: string }

export type PreparedImage = {
  name: string
  type: 'image/jpeg' | 'image/png'
  size: number
  body: Blob | NativeFilePart
}

export const MAX_UPLOAD_BYTES = 10_000_000
const WEB_MAX_EDGE = 1600
const WEB_JPEG_QUALITY = 0.85

export class ImageUploadError extends Error {}

function nativeMime(uri: string, mimeType?: string | null): 'image/jpeg' | 'image/png' {
  const mime = mimeType?.toLowerCase()
  if (mime === 'image/png' || (!mime && uri.toLowerCase().endsWith('.png'))) return 'image/png'
  if (!mime || mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg'
  throw new ImageUploadError('Photos must be JPG or PNG. Try taking the photo in the app instead.')
}

function baseName(fileName: string | null | undefined, fallback: string): string {
  const stem = (fileName ?? '').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60)
  return stem || fallback
}

function loadWebImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageUploadError('This photo format isn’t supported here. Choose a JPG or PNG.'))
    }
    image.src = url
  })
}

async function prepareWebImage(source: ImageSource, name: string): Promise<PreparedImage> {
  const original = source.file ?? (await (await fetch(source.uri)).blob())
  const image = await loadWebImage(original)
  const scale = Math.min(1, WEB_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new ImageUploadError('Could not prepare this photo.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', WEB_JPEG_QUALITY))
  if (!blob) throw new ImageUploadError('Could not prepare this photo.')
  return { name: `${name}.jpg`, type: 'image/jpeg', size: blob.size, body: blob }
}

async function nativeFileSize(source: ImageSource): Promise<number> {
  if (source.fileSize && source.fileSize > 0) return source.fileSize
  const blob = await (await fetch(source.uri)).blob()
  return blob.size
}

/** Web photos are re-encoded as a ~1600 px JPEG; native photos are sent as captured. */
export async function prepareImageForUpload(source: ImageSource, fallbackName = 'photo'): Promise<PreparedImage> {
  const name = baseName(source.fileName, fallbackName)
  const prepared =
    Platform.OS === 'web'
      ? await prepareWebImage(source, name)
      : await (async () => {
          const type = nativeMime(source.uri, source.mimeType)
          const fileName = `${name}.${type === 'image/png' ? 'png' : 'jpg'}`
          return {
            name: fileName,
            type,
            size: await nativeFileSize(source),
            body: { uri: source.uri, name: fileName, type },
          }
        })()
  if (!prepared.size) throw new ImageUploadError('Could not read this photo. Please retake it.')
  if (prepared.size > MAX_UPLOAD_BYTES) throw new ImageUploadError('Each photo must be 10 MB or smaller.')
  return prepared
}

/** Multipart photos use the same API bearer session and refresh behavior as user data. */
export async function uploadImageToBucket({ image, onProgress }: {
  bucketId: string
  fileId: string
  image: PreparedImage
  permissions: string[]
  onProgress?: (fraction: number) => void
}): Promise<Models.File> {
  const form = new FormData()
  if (image.body instanceof Blob) form.append('file', image.body, image.name)
  else form.append('file', image.body as unknown as Blob)
  onProgress?.(0.02)
  const file = await apiClient.post<Models.File>('/v1/files', form)
  onProgress?.(1)
  return file
}
