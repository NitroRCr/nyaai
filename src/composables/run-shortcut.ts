import type { Row } from '@rocicorp/zero'
import { entityRoute } from '../utils/functions'
import { useRouter } from 'vue-router'
import { useRightDirStore } from 'src/stores/right-dir'
import type { EntityType } from 'app/src-shared/utils/validators'
import { createEntity } from 'src/utils/create-entity'
import { useUserDataStore } from 'src/stores/user-data'
import { useLocalEntitiesStore } from 'src/stores/local-entities'
import { useRecentEntitiesStore } from 'src/stores/recent-entities'

const welcomeTypes: EntityType[] = ['chat', 'translation', 'page', 'provider', 'channel', 'item']

export function useRunShortcut() {
  const router = useRouter()
  const rightDirStore = useRightDirStore()
  const userDataStore = useUserDataStore()
  const recentEntitiesStore = useRecentEntitiesStore()
  const { getAncestors } = useLocalEntitiesStore()

  return function runShortcut(shortcut: Row['shortcut']) {
    if (shortcut.dirId) rightDirStore.dirId = shortcut.dirId
    if (shortcut.type) {
      const welcomed = userDataStore.data?.welcomed ?? []
      if (welcomeTypes.includes(shortcut.type) && !welcomed.includes(shortcut.type)) {
        router.push(`/${shortcut.type}/welcome`)
        userDataStore.updateData({ welcomed: [...welcomed, shortcut.type] })
        return
      }
    }
    if (shortcut.action === 'openLast') {
      const lastEntity = recentEntitiesStore.entities.find(e =>
        (!shortcut.type || e.type === shortcut.type) &&
        (!shortcut.dirId || getAncestors(e).some(a => a.id === shortcut.dirId)),
      )
      if (!lastEntity) {
        shortcut.type && createEntity(rightDirStore.dirId!, shortcut.type)
        return
      }
      router.push(entityRoute(lastEntity.type, lastEntity.id))
    } else if (shortcut.action === 'createNew') {
      shortcut.type && createEntity(rightDirStore.dirId!, shortcut.type)
    }
  }
}
