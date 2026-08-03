export type AiawImportStatus = 'queued' | 'running' | 'completed' | 'failed'

export type AiawImportStage = 'queued' | 'parsing' | 'preparing' | 'importing' | 'committing' | 'completed' | 'failed'

export interface AiawImportCounts {
  workspaces: number
  assistants: number
  dialogs: number
  messages: number
  items: number
}

export interface AiawImportWarnings {
  orphanMessages: number
  orphanItems: number
  missingMessageReferences: number
  unknownAssistantReferences: number
  skippedBinaryItems: number
}

export interface AiawImportJobSnapshot {
  id: string
  status: AiawImportStatus
  stage: AiawImportStage
  progress: number
  folderId?: string
  counts: AiawImportCounts
  totals: AiawImportCounts
  warnings: AiawImportWarnings
  error?: string
  createdAt: number
  updatedAt: number
}
