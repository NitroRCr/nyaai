import { defineStore, acceptHMRUpdate } from 'pinia'
import { usePerfsState } from 'src/composables/perfs-state'
import { computed, watchEffect } from 'vue'
import { localReactive } from 'src/composables/local-reactive'
import type { ShortcutKey, Writable } from 'src/utils/types'
import { Dark } from 'quasar'
import { mutators } from 'app/src-shared/mutators'
import { useUserDataStore } from './user-data'
import { useWorkspaceStore } from './workspace'
import { DEFAULT_HUE } from 'src/utils/config'
import { mutate } from '../utils/zero-session'

const StorageKey = 'perfs'

export const DefaultPerfs = {
  darkMode: 'auto' as boolean | 'auto',
  themeHue: DEFAULT_HUE,
  mdPreviewTheme: 'vuepress',
  mdCodeTheme: 'atom',
  mdNoMermaid: false,
  mdAutoFoldThreshold: null as number | null,
  showMessageWarnings: false,
  expandReasoningContent: true,
  codePasteOptimize: false,
  sendMessageKey: { key: 'Enter', withCtrl: true } as ShortcutKey,
  translateKey: { key: 'Enter', withCtrl: true } as ShortcutKey,
  navigationPanelShortcut: { key: 'KeyP', withCtrl: true } as ShortcutKey,
  regenerateCurrKey: { key: 'KeyR', withCtrl: true } as ShortcutKey,
  editCurrKey: { key: 'KeyE', withCtrl: true } as ShortcutKey,
  scrollUpKey: { key: 'ArrowUp', withCtrl: true } as ShortcutKey,
  scrollDownKey: { key: 'ArrowDown', withCtrl: true } as ShortcutKey,
  scrollTopKey: { key: 'ArrowUp', withShift: true } as ShortcutKey,
  scrollBottomKey: { key: 'ArrowDown', withShift: true } as ShortcutKey,
  focusInputKey: null as ShortcutKey,
  streamingLockBottom: true,
  messageSelectionMenu: true,
  autoGenChatTitle: true,
  chatScrollBtns: true,
  channelScrollBtns: true,
}

export type Perfs = typeof DefaultPerfs

export const usePerfsStore = defineStore('perfsStore', () => {
  const userDataStore = useUserDataStore()
  const workspaceStore = useWorkspaceStore()
  const userPerfs = computed(() => userDataStore.perfs ?? {})
  const workspacePerfs = computed(() => workspaceStore.workspace?.perfs ?? {})
  const localPerfs = localReactive<Partial<Writable<Perfs>>>(StorageKey, {})
  const { perfs } = usePerfsState(computed(() => [userPerfs.value, workspacePerfs.value, localPerfs]), DefaultPerfs)

  watchEffect(() => {
    Dark.set(perfs.value.darkMode)
  })

  async function update({ updates, deletes, scope }: {
    updates?: Partial<Perfs>
    deletes?: (keyof Perfs)[]
    scope: 'user' | 'workspace' | 'local'
  }) {
    if (scope === 'user') {
      await mutate(mutators.updateUserPerfs({
        updates,
        deletes,
      })).client
    } else if (scope === 'workspace') {
      await mutate(mutators.updateWorkspacePerfs({
        workspaceId: workspaceStore.id!,
        updates,
        deletes,
      })).client
    } else {
      Object.assign(localPerfs, updates)
      deletes?.forEach(key => {
        delete localPerfs[key]
      })
    }
  }
  return {
    userPerfs,
    workspacePerfs,
    localPerfs,
    perfs,
    update,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePerfsStore, import.meta.hot))
}
