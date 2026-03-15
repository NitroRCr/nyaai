import { acceptHMRUpdate, defineStore } from 'pinia'
import { useRoute } from 'vue-router'
import { useQuery } from 'src/composables/zero/query'
import { useRightDirStore } from './right-dir'
import { queries } from 'app/src-shared/queries'
import { useRightEntity } from 'src/composables/right-entity'
import { watch, watchEffect } from 'vue'
import { entityName } from 'src/utils/defaults'

export const useEntityStore = defineStore('entity', () => {
  const route = useRoute()
  const rightDirStore = useRightDirStore()
  const { data: entity } = useQuery(() =>
    typeof route.params.id === 'string'
      ? queries.entity({ id: route.params.id, parent: { depth: 5 } })
      : null,
  )
  watchEffect(() => {
    if (!entity.value) return
    document.title = `${entityName(entity.value)} - Nya AI`
  })
  const rightEntityInfo = useRightEntity()
  const { data: rightEntity } = useQuery(() =>
    rightEntityInfo.value
      ? queries.entity({ id: rightEntityInfo.value.id, parent: { depth: 5 } })
      : null,
  )
  const { data: dirEntity } = useQuery(() =>
    rightDirStore.dirId
      ? queries.entity({ id: rightDirStore.dirId, parent: { depth: 5 } })
      : null,
  )

  watch(() => entity.value?.id, () => {
    if (entity.value) rightDirStore.dirId = entity.value.parentId
  }, { immediate: true })
  return { entity, rightEntity, dirEntity }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEntityStore, import.meta.hot))
}
