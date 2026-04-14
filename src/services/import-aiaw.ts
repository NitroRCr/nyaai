import { mutate } from 'src/utils/zero-session'
import { genId } from 'app/src-shared/utils/id'
import type { AppendMessageArgs } from 'app/src-shared/mutators'
import { mutators } from 'app/src-shared/mutators'
import { upload } from 'src/utils/blob-cache'
import { base64ToUint8Array } from 'app/src-shared/utils/functions'
import { getNameAvatar } from './generate-chat-title'

interface AiawExport {
  formatName: string
  formatVersion: number
  data: {
    databaseName: string
    databaseVersion: number
    tables: any[]
    data: {
      tableName: string
      inbound?: boolean
      rows: any[]
    }[]
  }
}

export async function importAiaw(file: File, targetFolderId: string, updateProgress?: (progress: number) => void) {
  const content = await file.text()
  const dump = JSON.parse(content) as AiawExport

  if (dump.formatName !== 'dexie') {
    throw new Error('Unsupported format. Need dexie export.')
  }

  const getRows = (tableName: string) =>
    dump.data.data.find(t => t.tableName === tableName)?.rows || []

  // Create mapping dictionaries for ids
  const idMap = new Map<string, string>()
  const getNewId = (oldId: string | undefined) => {
    if (!oldId) return undefined
    if (!idMap.has(oldId)) idMap.set(oldId, genId(parseInt(oldId.slice(0, 9), 32)))
    return idMap.get(oldId)!
  }

  const workspaces = getRows('workspaces')
  const dialogs = getRows('dialogs')
  const messages = getRows('messages')
  const assistants = getRows('assistants')
  const avatarImages = getRows('avatarImages')
  const items = getRows('items')

  // 1. Avatar Images
  for (const av of avatarImages) {
    if (!av.contentBuffer) continue
    const newId = getNewId(av.id)!

    await mutate(mutators.createItem({
      id: newId,
      parentId: targetFolderId,
      name: 'avatar',
      mimeType: av.mimeType || 'image/png',
      hidden: true,
    })).client

    const buf = base64ToUint8Array(av.contentBuffer)
    const blob = new Blob([buf], { type: av.mimeType || 'image/png' })
    await upload(newId, blob, 'avatar').catch(console.error)
  }

  // 2. Workspaces
  const wsMap = new Map(workspaces.map(w => [w.id, w]))
  const createdWs = new Set<string>()

  const createWs = async (w: any) => {
    if (createdWs.has(w.id)) return
    if (w.parentId && w.parentId !== '$root' && wsMap.has(w.parentId)) {
      await createWs(wsMap.get(w.parentId))
    }
    const newId = getNewId(w.id)!
    const pId = (!w.parentId || w.parentId === '$root') ? targetFolderId : getNewId(w.parentId)!
    await mutate(mutators.createFolder({
      id: newId,
      parentId: pId,
      name: w.name,
    })).client
    createdWs.add(w.id)
  }

  for (const w of workspaces) {
    await createWs(w)
  }

  // 3. Assistants
  for (const a of assistants) {
    const newId = getNewId(a.id)!
    const pId = getNewId(a.workspaceId) || targetFolderId
    const avatar = a.avatar?.type === 'image' ? { type: 'image', itemId: getNewId(a.avatar.imageId) } : a.avatar
    await mutate(mutators.createAssistant({
      id: newId,
      parentId: pId,
      name: a.name,
      avatar,
    })).client
    await mutate(mutators.updateAssistant({
      id: newId,
      prompt: a.prompt,
      promptRole: a.promptRole === 'user' ? 'user' : 'system',
    })).client
  }

  // Group items by dialogId
  const itemsByDialog = new Map<string, any[]>()
  for (const item of items) {
    const dialogId = item.dialogId
    if (!itemsByDialog.has(dialogId)) {
      itemsByDialog.set(dialogId, [])
    }
    itemsByDialog.get(dialogId)!.push(item)
  }

  // 4. Dialogs & Messages
  const messagesByDialog = new Map<string, any[]>()
  for (const m of messages) {
    if (!messagesByDialog.has(m.dialogId)) {
      messagesByDialog.set(m.dialogId, [])
    }
    messagesByDialog.get(m.dialogId)!.push(m)
  }

  dialogs.sort((a, b) => a.id < b.id ? 1 : -1) // sort dialogs by id desc

  for (let i = 0; i < dialogs.length; i++) {
    const d = dialogs[i]
    const newChatId = getNewId(d.id)!
    const pId = getNewId(d.workspaceId) || targetFolderId
    const rootMessageId = genId()

    mutate(mutators.createChat({
      ids: [newChatId, rootMessageId],
      parentId: pId,
      ...getNameAvatar(d.name),
    }))
    mutate(mutators.deleteBranch({
      entityId: newChatId,
      parent: '$root',
      branch: 0,
    }))

    // Import Items for this dialog
    const dItems = itemsByDialog.get(d.id) || []
    for (const item of dItems) {
      const newId = getNewId(item.id)!

      const promise = mutate(mutators.createItem({
        id: newId,
        parentId: newChatId,
        name: item.name || 'item',
        mimeType: item.mimeType,
        text: item.contentText,
        hidden: false,
      })).server

      if (item.contentBuffer) {
        const buf = base64ToUint8Array(item.contentBuffer)
        const blob = new Blob([buf], { type: item.mimeType || 'application/octet-stream' })
        upload(newId, blob, item.name || 'file', promise)
      }
    }

    const dMsgs = messagesByDialog.get(d.id) || []
    const msgMap = new Map(dMsgs.map(m => [m.id, m]))

    const appends: AppendMessageArgs[] = []

    // traverse msgTree
    const processMessage = (oldMsgId: string, targetId: string) => {
      const m = msgMap.get(oldMsgId)
      if (!m) return

      if (m.contents[0] && m.contents[0].type !== 'assistant-tool') {
        const content = m.contents[0]
        const text = content.text || ''
        const reasoning = content.reasoning || null
        const isUser = m.type === 'user'
        const msgType = isUser ? 'chat:user' : 'chat:assistant'

        const newMsgId = getNewId(m.id)!

        const assistantId = m.assistantId ? getNewId(m.assistantId) : null

        appends.push({
          entityId: newChatId,
          target: targetId,
          props: {
            id: newMsgId,
            text,
            type: msgType,
            assistantId,
            reasoning,
            modelName: m.modelName,
          },
          entities: content.items?.map((it: string) => getNewId(it)).filter(Boolean),
        })

        // continue down the tree
        if (d.msgTree && d.msgTree[oldMsgId]) {
          for (const childId of d.msgTree[oldMsgId]) {
            processMessage(childId, newMsgId)
          }
        }
      }
    }

    if (d.msgTree) {
      // Find the root messages (those that are values in $root or simply the start of the tree)
      const roots = d.msgTree['$root']
      for (const rootId of roots) {
        processMessage(rootId, '$root')
      }
    }
    mutate(mutators.appendMessageBatch(appends))

    // small delay to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 100))
    updateProgress?.((i + 1) / dialogs.length)
  }
}
