import type { AssistantContent, ModelMessage, UserContent } from 'ai'
import { queries, type FullChat, type FullMessage } from 'app/src-shared/queries'
import { mimeTypeMatch } from './functions'
import type { ToolResultItem } from 'app/src-shared/utils/types'
import { getBlob, getBufferOrURL } from './blob-cache'
import { entityName } from './defaults'
import { uint8ArrayToBase64 } from 'app/src-shared/utils/functions'
import type { ToolResultOutput } from '@ai-sdk/provider-utils'
import type { ModelInputTypes } from 'app/src-shared/utils/validators'
import type { Row } from '@rocicorp/zero'
import { z } from './zero-session'
import { engine } from './template-engine'

export async function toToolResultOutput(
  result: ToolResultItem[],
  inputTypes: ModelInputTypes,
): Promise<ToolResultOutput> {
  const value: Extract<ToolResultOutput, { type: 'content' }>['value'] = []
  for (const c of result) {
    if (c.type === 'text') {
      value.push({
        type: 'text',
        text: c.text,
      })
    } else if (mimeTypeMatch(c.mimeType, inputTypes.tool)) {
      const blob = await getBlob(c.itemId)
      value.push({
        type: c.mimeType.startsWith('image/') ? 'image-data' : 'file-data',
        data: uint8ArrayToBase64(new Uint8Array(await blob.arrayBuffer())),
        mediaType: c.mimeType,
      })
    }
  }
  return {
    type: 'content',
    value,
  }
}

export async function toModelMessages(messages: FullMessage[], inputTypes: ModelInputTypes): Promise<ModelMessage[]> {
  const res: ModelMessage[] = []
  for (const m of messages) {
    if (m.type.endsWith(':assistant')) {
      const content: AssistantContent = [{ type: 'text', text: m.text }]
      m.reasoning && content.push({ type: 'reasoning', text: m.reasoning })
      for (const entity of m.entities) {
        if (entity.item?.mimeType) {
          const { item } = entity
          if (item.mimeType && mimeTypeMatch(item.mimeType, inputTypes.assistant)) {
            content.push({
              type: 'file',
              data: await getBufferOrURL(item.id),
              mediaType: item.mimeType,
              filename: entityName(entity),
            })
          }
        } else {
          const text = await serializeEntity(entity)
          text && content.push({
            type: 'text',
            text,
          })
        }
      }
      for (const t of m.toolCalls) {
        content.push({
          type: 'tool-call',
          toolCallId: t.id,
          toolName: t.name,
          input: t.input,
        })
        t.result && content.push({
          type: 'tool-result',
          toolCallId: t.id,
          toolName: t.name,
          output: await toToolResultOutput(t.result, inputTypes),
        })
        t.error && content.push({
          type: 'tool-result',
          toolCallId: t.id,
          toolName: t.name,
          output: {
            type: 'error-text',
            value: t.error,
          },
        })
      }
      res.push({ role: 'assistant', content })
    } else {
      const content: UserContent = [{ type: 'text', text: m.text }]
      for (const entity of m.entities) {
        if (entity.item) {
          const { item } = entity
          if (item.mimeType && mimeTypeMatch(item.mimeType, inputTypes.user)) {
            if (item.mimeType?.startsWith('image/')) {
              content.push({
                type: 'image',
                image: await getBufferOrURL(item.id),
                mediaType: item.mimeType,
              })
            } else {
              content.push({
                type: 'file',
                data: await getBufferOrURL(item.id),
                mediaType: item.mimeType,
                filename: entityName(entity),
              })
            }
          } else if (item.text) {
            content.push({
              type: 'text',
              text: `<content name="${entityName(entity)}">\n${item.text}\n</content>`,
            })
          }
        }
      }
      res.push({ role: 'user', content })
    }
  }
  return res
}

const entitySerializeTemplate =
`<{{ entity.type }} name="entity.name">
{{ content }}
</{{ entity.type }}`

async function serializeEntity(entity: Row['entity']) {
  if (entity.type === 'page') {
    const page = await z.run(queries.fullPage(entity.id), { type: 'complete' })
    if (!page) return
    const { getPageEditor } = await import('./page-editor')
    const editor = getPageEditor(page.patches)
    const content = editor.getMarkdown()
    editor.destroy()
    return await engine.parseAndRender(entitySerializeTemplate, {
      entity,
      content,
    })
  }
}

export function getChain(tree: Record<string, string[]>, node: string, route: Record<string, number>): string[] {
  const children = tree[node]
  const r = route[node] ?? 0
  return children[r] ? [node, ...getChain(tree, children[r], route)] : [node]
}

export function getChatChain(chat: FullChat) {
  return getChain(chat.msgTree, '$root', chat.msgRoute)
}

export type UIMessage = Pick<
  FullMessage,
  'id' | 'text' | 'reasoning' | 'entities' | 'toolCalls' | 'error' | 'warnings' | 'sentAt' | 'modelName'
> & {
  align: 'left' | 'right'
  background: boolean
  actions: {
    regenerate: boolean
    edit: boolean
    directDelete: boolean
    directEdit: boolean
  }
}
