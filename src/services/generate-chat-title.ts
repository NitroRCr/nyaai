import { generateText } from 'ai'
import { mutators } from 'app/src-shared/mutators'
import type { FullChat, FullModel } from 'app/src-shared/queries'
import { mutate } from 'src/utils/zero-session'
import { getChatChain } from 'src/utils/chat-tools'
import { arrayToMap } from 'src/utils/functions'
import { toSdkModel } from 'src/utils/model'
import { engine } from 'src/utils/template-engine'
import { ChatTitlePrompt } from 'src/utils/templates'

export async function generateChatTitle({ chat, model }: {
  chat: FullChat
  model: FullModel
}) {
  const messageMap = arrayToMap(chat.messages, m => m.id)
  const chain = getChatChain(chat)
  const messages = chain.slice(1, -1).map(id => messageMap[id])
  const prompt = await engine.parseAndRender(ChatTitlePrompt, { messages })
  const { text } = await generateText({
    model: toSdkModel(model),
    prompt,
  })
  const [emoji, ...rest] = text.split(' ')
  if ([1, 2].includes(emoji.length)) {
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
