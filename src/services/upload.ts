import ky from 'ky'
import { formatBytes, formatTime, getItemUrl } from 'src/utils/functions'
import { hashBlob } from 'src/utils/hash'
import { withTask } from 'src/utils/tasks'

export interface UploadProgress {
  uploaded: number
  total: number
  speed: number
  eta: number | null
}
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  signal?: AbortSignal
}

export function putBlob(
  url: string,
  blob: Blob,
  headers: Record<string, string> = {},
  { onProgress, signal }: UploadOptions = {},
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    let lastLoaded = 0
    let lastTime = Date.now()

    signal?.addEventListener('abort', () => {
      xhr.abort()
      reject(new DOMException('Upload aborted', 'AbortError'))
    })

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return

      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000
      const bytesDiff = event.loaded - lastLoaded

      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0

      const remaining = event.total - event.loaded
      const eta = speed > 0 ? remaining / speed : null

      lastLoaded = event.loaded
      lastTime = now

      onProgress?.({
        uploaded: event.loaded,
        total: event.total,
        speed,
        eta,
      })
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText)
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })
    xhr.addEventListener('abort', () => {
      reject(new DOMException('Upload aborted', 'AbortError'))
    })
    xhr.open('PUT', url)
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.send(blob)
  })
}

export const uploadBlob = withTask(async (
  { abortSignal, updateProgress },
  id: string,
  blob: Blob,
) => {
  const sha256 = await hashBlob(blob)
  const headers = {
    'sha-256': sha256,
    'sha-256-proof': await hashBlob(blob, 'proof'),
  }
  const precheck = await ky.put(getItemUrl(id), { headers, signal: abortSignal }).json<{ success?: boolean, error?: string }>()
  if (precheck.success) return sha256
  await putBlob(getItemUrl(id), blob, headers, {
    signal: abortSignal,
    onProgress: ({ uploaded, total, speed, eta }) => updateProgress({
      progress: uploaded / total,
      progressText: `${formatBytes(speed)}/s - ${formatBytes(uploaded)}/${formatBytes(total)} - ${formatTime(eta)}`,
    }),
  })
  return sha256
})
