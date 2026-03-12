import { mutators } from 'app/src-shared/mutators'
import type { FullMessage } from 'app/src-shared/queries'
import { genId } from 'app/src-shared/utils/id'
import { displayLength, textBeginning, wrapQuote } from 'src/utils/functions'
import { mutate } from 'src/utils/zero-session'
import type { Ref } from 'vue'

export function useQuote(inputingMessage: Ref<FullMessage | undefined>) {
  return function quote(text: string) {
    const message = inputingMessage.value
    if (!message) return
    if (displayLength(text) > 500) {
      mutate(mutators.createMessageItem({
        id: genId(),
        name: `"${textBeginning(text, 16)}"`,
        messageId: message.id,
        parentId: message.entityId,
        text,
      }))
    } else {
      mutate(mutators.updateInputingMessage({
        id: message.id,
        text: wrapQuote(text) + '\n\n' + message.text,
      }))
    }
  }
}
