import type { AiawImportJobSnapshot } from 'app/src-shared/aiaw-import'

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function getActiveAiawImportJob() {
  const result = await responseJson<{ job: AiawImportJobSnapshot | null }>(await fetch('/api/import/aiaw/active'))
  return result.job
}

export async function waitForAiawImportJob(
  initialJob: AiawImportJobSnapshot,
  updateProgress?: (job: AiawImportJobSnapshot) => void,
) {
  let job = initialJob
  updateProgress?.(job)
  while (job.status === 'queued' || job.status === 'running') {
    await wait(document.hidden ? 2000 : 500)
    const result = await responseJson<{ job: AiawImportJobSnapshot }>(await fetch(`/api/import/aiaw/${job.id}`))
    job = result.job
    updateProgress?.(job)
  }

  if (job.status === 'failed') throw new Error(job.error || 'Import failed')
  return job
}

export async function importAiaw(
  file: File,
  targetFolderId: string,
  folderName: string,
  updateProgress?: (job: AiawImportJobSnapshot) => void,
) {
  const form = new FormData()
  form.set('file', file)
  form.set('parentId', targetFolderId)
  form.set('folderName', folderName)

  const { job: startedJob } = await responseJson<{ job: AiawImportJobSnapshot }>(await fetch('/api/import/aiaw', {
    method: 'POST',
    body: form,
  }))

  return await waitForAiawImportJob(startedJob, updateProgress)
}
