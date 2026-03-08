import { defineStore, acceptHMRUpdate } from 'pinia'
import { mutate, user } from '../utils/zero-session'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import { mutators } from 'app/src-shared/mutators'
import { computed } from 'vue'

export const useUserDataStore = defineStore('user-data', () => {
  const { data, status } = useQuery(() => user.id ? queries.userData() : null)

  async function updateData(updates: Record<string, any>) {
    await mutate(mutators.updateUserData({ updates })).client
  }
  return {
    lastWorkspaceId: computed(() => data.value?.lastWorkspaceId),
    data: computed(() => data.value?.data),
    perfs: computed(() => data.value?.perfs),
    status,
    updateData,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserDataStore, import.meta.hot))
}
