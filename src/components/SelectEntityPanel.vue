<template>
  <div>
    <div
      flex
      gap-2
      px-2
    >
      <a-input
        v-model="args.query"
        :debounce="100"
        outlined
        dense
        clearable
        class="grow"
        autofocus
        :placeholder="t('Search items...')"
        @keydown="onKeyDown"
      />
      <entity-type-select
        :label="t('Type')"
        v-model="args.type"
        dense
        class="min-w-60px"
      />
    </div>
    <div
      max-h="60vh"
      overflow-y-auto
      mt-2
      px-2
    >
      <q-list ref="listRef">
        <q-item
          v-if="status === 'complete' && !rows.length"
          min-h="40px"
        >
          <q-item-section>
            <q-item-label text-on-sur-var>
              {{ t('No results found') }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <dense-item
          v-for="(r, i) in rows"
          :key="r.id"
          :label="entityName(r)"
          :avatar="entityAvatar(r)"
          :to="entityRoute(r.type, r.id)"
          @click.prevent="$emit('select', r)"
          :caption="getPath(r)"
          :class="{ 'bg-sur-c-high': i === focusedIndex }"
          item-rd
        />
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AInput from './AInput'
import { t } from 'src/utils/i18n'
import EntityTypeSelect from './EntityTypeSelect.vue'
import type { EntityType } from 'app/src-shared/utils/validators'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useRecentEntitiesStore } from 'src/stores/recent-entities'
import { entityRoute } from 'src/utils/functions'
import { entityAvatar, entityName } from 'src/utils/defaults'
import DenseItem from './DenseItem.vue'
import type { Row } from '@rocicorp/zero'
import { useLocalEntitiesStore } from 'src/stores/local-entities'
import { useRouter } from 'vue-router'

const props = defineProps<{
  defaultType?: EntityType
}>()

defineEmits<{
  select: [Row['entity']]
}>()

const args = reactive({
  query: '',
  type: props.defaultType ?? null,
})

const workspaceStore = useWorkspaceStore()

const { data, status } = useQuery(computed(() =>
  args.query
    ? queries.searchEntities({ workspaceId: workspaceStore.id!, ...args })
    : null,
))
const recentEntitiesStore = useRecentEntitiesStore()

const rows = computed(() => data.value ?? recentEntitiesStore.entities.filter(e =>
  !args.type || e.type === args.type,
))

const { getAncestors } = useLocalEntitiesStore()
function getPath(entity: Row['entity']) {
  const ancestors = getAncestors(entity)
  return ancestors.slice(1).map(e => entityName(e)).join(' / ')
}

const router = useRouter()
const focusedIndex = ref(0)
function onKeyDown(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') {
    focusedIndex.value = (focusedIndex.value + 1) % rows.value.length
  } else if (ev.key === 'ArrowUp') {
    focusedIndex.value = (focusedIndex.value - 1 + rows.value.length) % rows.value.length
  } else if (ev.key === 'Enter') {
    const entity = rows.value[focusedIndex.value]
    entity && router.push(entityRoute(entity.type, entity.id))
  }
}
</script>
