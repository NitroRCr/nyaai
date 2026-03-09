import type { ToolSet } from 'ai'
import { jsonSchema, stepCountIs, streamText, tool } from 'ai'
import { finish, start, update } from 'src/composables/state-proxy'
import { mutate } from 'src/utils/zero-session'
import type { FullChat, FullModel } from 'app/src-shared/queries'
import { arrayToMap } from 'src/utils/functions'
import { getChatChain, toModelMessages, toToolResultOutput } from 'src/utils/chat-tools'
import { engine } from 'src/utils/template-engine'
import { withTask } from 'src/utils/tasks'
import { mutators } from 'app/src-shared/mutators'
import type { PluginTool, StreamSettings, ToolResultItem } from 'app/src-shared/utils/types'
import { toSdkModel } from 'src/utils/model'
import { genId } from 'app/src-shared/utils/id'
import { upload } from 'src/utils/blob-cache'
import { base64ToUint8Array } from 'app/src-shared/utils/functions'
import { t } from 'src/utils/i18n'
import { modelInputTypes } from 'src/utils/defaults'
import { parseText } from 'src/utils/file-parse'
import { Notify } from 'quasar'

export async function streamMessage(entityId: string, id: string, ...params: Parameters<typeof streamText>) {
  const result = streamText(...params)
  let reasoning = ''
  let text = ''
  start(
    id,
    { reasoning, text },
    updates => mutate(mutators.updateAssistantMessage({ id, ...updates })),
    { type: 'throttle', wait: 2000 },
  )
  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      reasoning += part.text
      update(id, { reasoning })
    } else if (part.type === 'text-delta') {
      text += part.text
      update(id, { text })
    } else if (part.type === 'file') {
      const itemId = genId()
      const blob = new Blob([part.file.uint8Array as Uint8Array<ArrayBuffer>], { type: part.file.mediaType })
      const name = 'generated_file'
      mutate(mutators.createMessageItem({
        id: itemId,
        messageId: id,
        parentId: entityId,
        name,
        mimeType: part.file.mediaType,
        ...await parseText(blob),
      }))
      upload(itemId, blob, name)
    } else if (part.type === 'error') {
      mutate(mutators.updateAssistantMessage({ id, error: String(part.error) }))
      if ((part.error as any).responseBody.includes('Quota exceeded')) {
        Notify.create({
          message: t('AI Quota Exceeded. Please upgrade your plan or switch to free models.'),
          color: 'err-c',
          textColor: 'on-err-c',
          actions: [{
            label: t('Upgrade Plan'),
            noCaps: true,
            to: '/workspace/plans',
            color: 'on-sur',
          }],
        })
      }
      throw part.error
    }
  }
  finish(id)
  const usage = await result.usage
  const warnings = (await result.warnings)?.map(w => w.type === 'other' ? w.message : w.details).filter(w => w != null)
  await mutate(mutators.updateAssistantMessage({ id, usage, warnings })).client
}

export type CompletionConfig = {
  promptTemplate: string
  promptRole: 'system' | 'user'
  contextNum?: number | null
  streamSettings: StreamSettings
  vars: Record<string, any>
  tools: Record<string, PluginTool[]>
  sdkTools?: ToolSet
}
export const streamChat = withTask(async (
  { abortSignal },
  { chat, model, config }: {
    chat: FullChat
    model: FullModel
    config: CompletionConfig
  }) => {
  const messageMap = arrayToMap(chat.messages, m => m.id)
  const chain = getChatChain(chat)
  const inputTypes = modelInputTypes(model)
  const messages = await toModelMessages(
    chain
      .slice(1, -2)
      .slice(config.contextNum ? -config.contextNum : undefined)
      .map(id => messageMap[id]),
    inputTypes,
  )
  const prompt = await engine.parseAndRender(config.promptTemplate, config.vars)
  prompt.trim() && messages.unshift({
    role: config.promptRole,
    content: prompt,
  })
  const messageId = chain.at(-2)!
  const tools = Object.fromEntries(Object.entries(config.tools).flatMap(([pluginId, tools]) => tools.map(
    ({ name, title, description, inputSchema, execute }) => [`${pluginId}-${name}`, tool({
      title,
      description,
      inputSchema: jsonSchema(inputSchema),
      async execute(input) {
        const id = genId()
        await mutate(mutators.createToolCall({
          id,
          name,
          pluginId,
          messageId,
          status: 'calling',
          input,
        })).client
        const res = await execute(input).catch(async err => {
          await mutate(mutators.updateToolCall({
            id,
            status: 'failed',
            error: err.message,
          })).client
          throw err
        })
        const result: ToolResultItem[] = []
        async function handleBlob(name: string, base64: string, mimeType?: string) {
          const id = genId()
          await mutate(mutators.createItem({
            id,
            parentId: chat.id,
            name,
            mimeType,
          })).client
          const file = new File([base64ToUint8Array(base64)], name)
          upload(id, file, name)
          result.push({
            type: 'blob',
            mimeType: mimeType ?? file.type,
            itemId: id,
          })
        }
        for (const c of res.content) {
          if (c.type === 'text') {
            result.push({
              type: 'text',
              text: c.text,
            })
          } else if (c.type === 'resource') {
            const { resource } = c
            if ('text' in resource) {
              result.push({
                type: 'text',
                text: `<resource uri="${resource.uri}">\n${resource.text}\n</resource>`,
              })
            } else {
              await handleBlob(resource.uri.split('/').at(-1)!, resource.blob, resource.mimeType)
            }
          } else if (c.type === 'resource_link') {
            result.push({
              type: 'text',
              text: `<resource_link uri="${c.uri}" name="${c.name}" />`,
            })
          } else {
            await handleBlob(t('Tool Call Result'), c.data, c.mimeType)
          }
        }
        await mutate(mutators.updateToolCall({
          id,
          status: 'completed',
          result,
        })).client
        return result
      },
      toModelOutput: ({ output }) => toToolResultOutput(output, inputTypes),
    })],
  )))
  await streamMessage(chat.id, messageId, {
    ...config.streamSettings,
    ...model.settings,
    model: toSdkModel(model),
    messages,
    tools: {
      ...tools,
      ...config.sdkTools,
    },
    stopWhen: stepCountIs(config.streamSettings.maxSteps ?? 5),
    abortSignal,
  })
})
