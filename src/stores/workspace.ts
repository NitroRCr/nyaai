import { defineStore, acceptHMRUpdate } from 'pinia'
import { mutate, z } from '../utils/zero-session'
import { useQuery } from 'src/composables/zero/query'
import type { FullWorkspace } from 'app/src-shared/queries'
import { queries } from 'app/src-shared/queries'
import { mutators } from 'app/src-shared/mutators'
import type { MemberData } from 'app/src-shared/utils/validators'
import { computed, ref, watch, watchEffect } from 'vue'
import { until } from '@vueuse/core'
import { useUserDataStore } from './user-data'

export const useWorkspaceStore = defineStore('workspace', () => {
  const userDataStore = useUserDataStore()
  const id = ref<string | null>(null)
  until(() => userDataStore.lastWorkspaceId).toBeTruthy().then(val => {
    id.value ??= val
  })
  const { data: workspace, status } = useQuery(() =>
    id.value ? queries.fullWorkspace(id.value) : null,
  )

  z.preload(queries.globalSettings())
  z.preload(queries.publicModels())
  watchEffect(() => {
    if (!id.value) return
    z.preload(queries.models(id.value))
    z.preload(queries.entity({ id: id.value, children: { depth: 3 } }))
    z.preload(queries.recentChats(id.value))
    z.preload(queries.recentChannels(id.value))
    z.preload(queries.recentPages(id.value))
    z.preload(queries.recentTranslations(id.value))
    z.preload(queries.recentSearches(id.value))
  })

  async function updateData(updates: Partial<MemberData>) {
    if (!id.value) return
    await mutate(mutators.updateMemberData({ workspaceId: id.value, ...updates })).client
  }

  function switchWorkspace(to: string) {
    if (id.value === to) return
    id.value = to
    mutate(mutators.updateLastWorkspaceId(to))
  }
  // I don't know why computed doesn't work here
  const member = ref<FullWorkspace['member']>()
  watch(workspace, ws => {
    member.value = ws?.member
  }, { immediate: true })
  return {
    id,
    member,
    members: computed(() => workspace.value?.members),
    workspace,
    status,
    updateData,
    switchWorkspace,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWorkspaceStore, import.meta.hot))
}
