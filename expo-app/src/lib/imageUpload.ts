import { Platform } from 'react-native'
import { AppwriteException, type Models } from 'react-native-appwrite'
import { client, storage } from './appwrite'

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
/** Above this the SDK switches to chunked uploads, which a single multipart XHR can't do. */
const SINGLE_REQUEST_LIMIT = 5 * 1024 * 1024
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

function sdkHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...client.headers, 'X-Appwrite-Project': client.config.project }
  delete headers['content-type']
  if (Platform.OS !== 'web') headers.Origin = `appwrite-${Platform.OS}://${client.config.platform}`
  return headers
}

function parseResponse(xhr: XMLHttpRequest): Models.File {
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(xhr.responseText || '{}')
  } catch {
    data = { message: xhr.responseText }
  }
  if (xhr.status >= 400 || xhr.status === 0) {
    throw new AppwriteException(
      typeof data.message === 'string' && data.message ? data.message : 'Upload failed.',
      xhr.status,
      typeof data.type === 'string' ? data.type : '',
      xhr.responseText,
    )
  }
  return data as unknown as Models.File
}

/**
 * Multipart upload with progress. The SDK's `createFile` only reports progress for chunked
 * uploads and can't send a browser `Blob`, so single-request uploads go through XHR with the
 * same session cookies and project headers the SDK uses.
 */
export function uploadImageToBucket({
  bucketId,
  fileId,
  image,
  permissions,
  onProgress,
}: {
  bucketId: string
  fileId: string
  image: PreparedImage
  permissions: string[]
  onProgress?: (fraction: number) => void
}): Promise<Models.File> {
  if (image.size > SINGLE_REQUEST_LIMIT && !(image.body instanceof Blob)) {
    return storage.createFile({
      bucketId,
      fileId,
      file: { ...(image.body as NativeFilePart), size: image.size },
      permissions,
      onProgress: (progress) => onProgress?.(Math.min(1, progress.progress / 100)),
    })
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${client.config.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files`)
    xhr.withCredentials = true
    xhr.timeout = 120_000
    for (const [key, value] of Object.entries(sdkHeaders())) xhr.setRequestHeader(key, value)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(0.99, event.loaded / event.total))
    }
    xhr.onload = () => {
      try {
        const file = parseResponse(xhr)
        onProgress?.(1)
        resolve(file)
      } catch (error) {
        reject(error)
      }
    }
    xhr.onerror = () => reject(new AppwriteException('Upload failed. Check your connection and try again.', 0, 'network_error'))
    xhr.ontimeout = () => reject(new AppwriteException('The upload timed out. Try again on a stronger connection.', 0, 'network_timeout'))

    const form = new FormData()
    form.append('fileId', fileId)
    if (image.body instanceof Blob) form.append('file', image.body, image.name)
    else form.append('file', image.body as unknown as Blob)
    for (const permission of permissions) form.append('permissions[]', permission)
    xhr.send(form)
  })
}
