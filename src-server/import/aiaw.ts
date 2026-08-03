import { and, eq, inArray } from 'drizzle-orm'
import type { Avatar } from 'app/src-shared/utils/validators'
import { genId, randomId } from 'app/src-shared/utils/id'
import type { AiawImportJobSnapshot, AiawImportStage } from 'app/src-shared/aiaw-import'
import { db } from '../utils/db'
import * as schema from '../schema'

interface AiawTableData {
  tableName: string
  rows: Record<string, any>[]
}

interface AiawExport {
  formatName: string
  formatVersion: number
  data: {
    data: AiawTableData[]
  }
}

interface ImportParent {
  id: string
  rootId: string
  pubRoot: string | null
}

interface ImportJob extends AiawImportJobSnapshot {
  userId: string
}

const jobs = new Map<string, ImportJob>()
const DIALOG_BATCH_SIZE = 50
const MAX_RETAINED_JOBS = 50

const emptyCounts = () => ({
  workspaces: 0,
  assistants: 0,
  dialogs: 0,
  messages: 0,
  items: 0,
})

const emptyWarnings = () => ({
  orphanMessages: 0,
  orphanItems: 0,
  missingMessageReferences: 0,
  unknownAssistantReferences: 0,
  skippedBinaryItems: 0,
})

function snapshot(job: ImportJob): AiawImportJobSnapshot {
  const result = { ...job }
  Reflect.deleteProperty(result, 'userId')
  return result
}

function updateJob(job: ImportJob, updates: Partial<AiawImportJobSnapshot>) {
  Object.assign(job, updates, { updatedAt: Date.now() })
}

function pruneJobs() {
  if (jobs.size < MAX_RETAINED_JOBS) return
  const finished = [...jobs.values()]
    .filter(job => job.status === 'completed' || job.status === 'failed')
    .sort((a, b) => a.updatedAt - b.updatedAt)
  while (jobs.size >= MAX_RETAINED_JOBS && finished.length) {
    jobs.delete(finished.shift()!.id)
  }
}

export function createAiawImportJob(userId: string) {
  pruneJobs()
  const active = [...jobs.values()].find(job =>
    job.userId === userId && (job.status === 'queued' || job.status === 'running'),
  )
  if (active) return { active: snapshot(active) }

  const now = Date.now()
  const job: ImportJob = {
    id: randomId(),
    userId,
    status: 'queued',
    stage: 'queued',
    progress: 0,
    counts: emptyCounts(),
    totals: emptyCounts(),
    warnings: emptyWarnings(),
    createdAt: now,
    updatedAt: now,
  }
  jobs.set(job.id, job)
  return { job, snapshot: snapshot(job) }
}

export function getAiawImportJob(id: string, userId: string) {
  const job = jobs.get(id)
  return job?.userId === userId ? snapshot(job) : undefined
}

export function getActiveAiawImportJob(userId: string) {
  const job = [...jobs.values()].find(job =>
    job.userId === userId && (job.status === 'queued' || job.status === 'running'),
  )
  return job && snapshot(job)
}

function setStage(job: ImportJob, stage: AiawImportStage, progress: number) {
  updateJob(job, { status: 'running', stage, progress })
}

function getNameAvatar(value: unknown): { name?: string, avatar?: Avatar } {
  if (typeof value !== 'string') return {}
  const [first, ...rest] = value.split(' ')
  const graphemes = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(first)]
  if (graphemes.length === 1 && rest.length) {
    return {
      name: rest.join(' '),
      avatar: { type: 'text', text: first },
    }
  }
  return { name: value }
}

function parseDump(content: string) {
  const dump = JSON.parse(content) as AiawExport
  if (dump.formatName !== 'dexie' || !Array.isArray(dump.data?.data)) {
    throw new Error('Unsupported format. Need dexie export.')
  }
  return dump
}

export async function runAiawImportJob(job: ImportJob, file: File, parent: ImportParent, folderName: string) {
  try {
    setStage(job, 'parsing', 0.01)
    const dump = parseDump(await file.text())
    setStage(job, 'preparing', 0.03)

    const getRows = (tableName: string) =>
      dump.data.data.find(table => table.tableName === tableName)?.rows || []

    const workspaces = getRows('workspaces')
    const dialogs = getRows('dialogs').sort((a, b) => a.id < b.id ? 1 : -1)
    const messages = getRows('messages')
    const assistants = getRows('assistants')
    const avatarImages = getRows('avatarImages')
    const items = getRows('items')

    updateJob(job, {
      totals: {
        workspaces: workspaces.length,
        assistants: assistants.length,
        dialogs: dialogs.length,
        messages: messages.length,
        items: items.length + avatarImages.length,
      },
    })

    const dialogIds = new Set(dialogs.map(dialog => dialog.id))
    const assistantIds = new Set(assistants.map(assistant => assistant.id))
    const workspaceIds = new Set(workspaces.map(workspace => workspace.id))
    const idMap = new Map<string, string>()
    const getNewId = (oldId: string | undefined) => {
      if (!oldId || oldId === '$root') return undefined
      if (!idMap.has(oldId)) {
        const timestamp = parseInt(oldId.slice(0, 9), 32)
        idMap.set(oldId, genId(Number.isNaN(timestamp) ? undefined : timestamp))
      }
      return idMap.get(oldId)!
    }

    const messagesByDialog = new Map<string, Record<string, any>[]>()
    for (const message of messages) {
      const list = messagesByDialog.get(message.dialogId) || []
      list.push(message)
      messagesByDialog.set(message.dialogId, list)
      if (!dialogIds.has(message.dialogId)) job.warnings.orphanMessages++
      if (message.assistantId && !assistantIds.has(message.assistantId)) {
        job.warnings.unknownAssistantReferences++
      }
    }

    const itemsByDialog = new Map<string, Record<string, any>[]>()
    for (const item of items) {
      const list = itemsByDialog.get(item.dialogId) || []
      list.push(item)
      itemsByDialog.set(item.dialogId, list)
      if (!dialogIds.has(item.dialogId)) job.warnings.orphanItems++
      if (item.contentBuffer) job.warnings.skippedBinaryItems++
    }
    for (const image of avatarImages) {
      if (image.contentBuffer) job.warnings.skippedBinaryItems++
    }

    const importFolderId = genId()
    job.folderId = importFolderId

    await db.transaction(async tx => {
      await tx.insert(schema.entity).values({
        id: importFolderId,
        rootId: parent.rootId,
        pubRoot: parent.pubRoot,
        parentId: parent.id,
        type: 'folder',
        name: folderName,
        conf: {},
        sortPriority: 10,
        hidden: false,
      })

      const workspaceMap = new Map(workspaces.map(workspace => [workspace.id, workspace]))
      const createdWorkspaces = new Set<string>()
      const visitingWorkspaces = new Set<string>()
      const createWorkspace = async (workspace: Record<string, any>) => {
        if (createdWorkspaces.has(workspace.id)) return
        if (visitingWorkspaces.has(workspace.id)) throw new Error(`Workspace cycle detected: ${workspace.id}`)
        visitingWorkspaces.add(workspace.id)
        const oldParentId = workspace.parentId
        if (oldParentId && oldParentId !== '$root' && workspaceMap.has(oldParentId)) {
          await createWorkspace(workspaceMap.get(oldParentId)!)
        }
        const parentId = oldParentId && oldParentId !== '$root' && workspaceMap.has(oldParentId)
          ? getNewId(oldParentId)!
          : importFolderId
        await tx.insert(schema.entity).values({
          id: getNewId(workspace.id)!,
          rootId: parent.rootId,
          pubRoot: parent.pubRoot,
          parentId,
          type: 'folder',
          name: workspace.name,
          conf: {},
          sortPriority: 10,
          hidden: false,
        })
        visitingWorkspaces.delete(workspace.id)
        createdWorkspaces.add(workspace.id)
        job.counts.workspaces++
      }
      for (const workspace of workspaces) await createWorkspace(workspace)

      if (avatarImages.length) {
        const avatarEntities = avatarImages.map(image => ({
          id: getNewId(image.id)!,
          rootId: parent.rootId,
          pubRoot: parent.pubRoot,
          parentId: importFolderId,
          type: 'item' as const,
          name: 'avatar',
          conf: {},
          sortPriority: 0,
          hidden: true,
        }))
        await tx.insert(schema.entity).values(avatarEntities)
        await tx.insert(schema.item).values(avatarImages.map(image => ({
          id: getNewId(image.id)!,
          rootId: parent.rootId,
          mimeType: image.mimeType || 'image/png',
        })))
        job.counts.items += avatarImages.length
      }

      if (assistants.length) {
        await tx.insert(schema.entity).values(assistants.map(assistant => {
          const imageId = assistant.avatar?.type === 'image' && getNewId(assistant.avatar.imageId)
          const avatar = imageId ? { ...assistant.avatar, itemId: imageId } : assistant.avatar
          return {
            id: getNewId(assistant.id)!,
            rootId: parent.rootId,
            pubRoot: parent.pubRoot,
            parentId: workspaceIds.has(assistant.workspaceId)
              ? getNewId(assistant.workspaceId)!
              : importFolderId,
            type: 'assistant' as const,
            name: assistant.name,
            avatar,
            conf: {},
            sortPriority: 0,
            hidden: false,
          }
        }))
        await tx.insert(schema.assistant).values(assistants.map(assistant => ({
          id: getNewId(assistant.id)!,
          rootId: parent.rootId,
          prompt: assistant.prompt,
          promptRole: assistant.promptRole === 'user' ? 'user' as const : 'system' as const,
          contextNum: 10,
          streamSettings: {},
          plugins: [],
        })))
        job.counts.assistants = assistants.length
      }

      setStage(job, 'importing', 0.08)
      for (let offset = 0; offset < dialogs.length; offset += DIALOG_BATCH_SIZE) {
        const batch = dialogs.slice(offset, offset + DIALOG_BATCH_SIZE)
        const chatEntities: typeof schema.entity.$inferInsert[] = []
        const chatRows: typeof schema.chat.$inferInsert[] = []
        const itemEntities: typeof schema.entity.$inferInsert[] = []
        const itemRows: typeof schema.item.$inferInsert[] = []
        const messageRows: typeof schema.message.$inferInsert[] = []
        const messageEntityRows: typeof schema.messageEntity.$inferInsert[] = []

        for (const dialog of batch) {
          const chatId = getNewId(dialog.id)!
          const title = getNameAvatar(dialog.name)
          const tree: Record<string, string[]> = { $root: [] }
          const route: Record<string, number> = { $root: -1 }
          const dialogMessages = messagesByDialog.get(dialog.id) || []
          const messageMap = new Map(dialogMessages.map(message => [message.id, message]))
          const dialogItems = itemsByDialog.get(dialog.id) || []
          const availableItemIds = new Set(dialogItems.map(item => item.id))

          chatEntities.push({
            id: chatId,
            rootId: parent.rootId,
            pubRoot: parent.pubRoot,
            parentId: workspaceIds.has(dialog.workspaceId)
              ? getNewId(dialog.workspaceId)!
              : importFolderId,
            type: 'chat',
            ...title,
            conf: {},
            sortPriority: 0,
            hidden: false,
          })

          for (const item of dialogItems) {
            const itemId = getNewId(item.id)!
            itemEntities.push({
              id: itemId,
              rootId: parent.rootId,
              pubRoot: parent.pubRoot,
              parentId: chatId,
              type: 'item',
              name: item.name || 'item',
              conf: {},
              sortPriority: 0,
              hidden: false,
            })
            itemRows.push({
              id: itemId,
              rootId: parent.rootId,
              mimeType: item.mimeType,
              text: item.contentText,
            })
          }

          const visited = new Set<string>()
          const processMessage = (oldMessageId: string, targetId: string) => {
            if (visited.has(oldMessageId)) return
            visited.add(oldMessageId)
            const oldMessage = messageMap.get(oldMessageId)
            if (!oldMessage) {
              job.warnings.missingMessageReferences++
              for (const childId of dialog.msgTree?.[oldMessageId] || []) processMessage(childId, targetId)
              return
            }

            const content = oldMessage.contents?.[0]
            let childTargetId = targetId
            if (content && content.type !== 'assistant-tool') {
              const messageId = getNewId(oldMessage.id)!
              tree[targetId] ||= []
              tree[targetId].push(messageId)
              route[targetId] = tree[targetId].length - 1
              tree[messageId] = []
              childTargetId = messageId

              messageRows.push({
                id: messageId,
                rootId: parent.rootId,
                entityId: chatId,
                userId: job.userId,
                type: oldMessage.type === 'user' ? 'chat:user' : 'chat:assistant',
                text: typeof content.text === 'string' ? content.text : '',
                reasoning: typeof content.reasoning === 'string' ? content.reasoning : null,
                modelName: oldMessage.modelName,
                assistantId: oldMessage.assistantId && assistantIds.has(oldMessage.assistantId)
                  ? getNewId(oldMessage.assistantId)
                  : null,
              })

              const referencedItems = new Set<string>(content.items || [])
              for (const oldItemId of referencedItems) {
                if (!availableItemIds.has(oldItemId)) continue
                messageEntityRows.push({
                  rootId: parent.rootId,
                  messageId,
                  entityId: getNewId(oldItemId)!,
                })
              }
            }

            for (const childId of dialog.msgTree?.[oldMessageId] || []) {
              processMessage(childId, childTargetId)
            }
          }

          for (const rootMessageId of dialog.msgTree?.$root || []) {
            processMessage(rootMessageId, '$root')
          }

          chatRows.push({
            id: chatId,
            rootId: parent.rootId,
            msgTree: tree,
            msgRoute: route,
          })
        }

        if (chatEntities.length) await tx.insert(schema.entity).values(chatEntities)
        if (chatRows.length) await tx.insert(schema.chat).values(chatRows)
        if (itemEntities.length) await tx.insert(schema.entity).values(itemEntities)
        if (itemRows.length) await tx.insert(schema.item).values(itemRows)
        if (messageRows.length) await tx.insert(schema.message).values(messageRows)
        if (messageEntityRows.length) await tx.insert(schema.messageEntity).values(messageEntityRows)

        job.counts.dialogs += batch.length
        job.counts.messages += messageRows.length
        job.counts.items += itemRows.length
        const completed = Math.min(offset + batch.length, dialogs.length)
        updateJob(job, { progress: 0.08 + 0.9 * (completed / Math.max(dialogs.length, 1)) })
      }

      setStage(job, 'committing', 0.99)
    })

    updateJob(job, { status: 'completed', stage: 'completed', progress: 1 })
  } catch (error) {
    console.error('AIaW import failed', error)
    updateJob(job, {
      status: 'failed',
      stage: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function findWritableImportParent(parentId: string, userId: string) {
  const [parent] = await db.select({
    id: schema.entity.id,
    rootId: schema.entity.rootId,
    pubRoot: schema.entity.pubRoot,
  }).from(schema.entity).innerJoin(schema.member, and(
    eq(schema.member.workspaceId, schema.entity.rootId),
    eq(schema.member.userId, userId),
    inArray(schema.member.role, ['owner', 'admin', 'member']),
  )).where(eq(schema.entity.id, parentId)).limit(1)
  return parent
}
