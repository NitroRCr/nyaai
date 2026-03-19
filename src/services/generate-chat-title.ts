import { generateText } from 'ai'
import { mutators } from 'app/src-shared/mutators'
import { queries, type FullChat } from 'app/src-shared/queries'
import { mutate, z } from 'src/utils/zero-session'
import { getChatChain } from 'src/utils/chat-tools'
import { arrayToMap, getTextLength } from 'src/utils/functions'
import { toSdkModel } from 'src/utils/model'
import { engine } from 'src/utils/template-engine'
import type { EntityConf } from 'src/composables/entity-conf'

export async function generateChatTitle({ chat, conf }: {
  chat: FullChat
  conf: EntityConf
}) {
  const modelId = conf.chatTitleModelId
  const model = modelId && await z.run(queries.fullModel(modelId), { type: 'complete' })
  if (!model) return
  const messageMap = arrayToMap(chat.messages, m => m.id)
  const chain = getChatChain(chat)
  const messages = chain.slice(1, -1).map(id => messageMap[id])
  const prompt = await engine.parseAndRender(conf.chatTitlePrompt, { messages })
  const { text } = await generateText({
    model: toSdkModel(model),
    prompt,
  })
  const [emoji, ...rest] = text.split(' ')
  if (getTextLength(emoji) === 1) {
    await mutate(mutators.updateEntity({
      id: chat.id,
      name: rest.join(' '),
      avatar: { type: 'text', text: emoji },
    })).client
  } else {
    await mutate(mutators.updateEntity({
      id: chat.id,
      name: text,
    })).client
  }
}
