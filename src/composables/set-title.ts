import type { Ref } from 'vue'
import { watchEffect } from 'vue'

export function useSetTitle(title: Ref<string>) {
  watchEffect(() => {
    if (!title.value) return
    document.title = `${title.value} - AI as Workspace`
  })
}
