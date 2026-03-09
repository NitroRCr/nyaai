<template>
  <div view-styles>
    <q-list>
      <common-item :label="t('Sort Priority')">
        <q-input
          :model-value="entity?.sortPriority"
          @update:model-value="$event && updateEntity({ sortPriority: parseInt($event as string) })"
          type="number"
          dense
          filled
          class="w-100px"
        />
      </common-item>
      <common-item :label="t('Hidden')">
        <q-toggle
          :model-value="entity?.hidden"
          @update:model-value="$event && updateEntity({ hidden: $event })"
        />
      </common-item>
      <q-separator spaced />
      <q-item-label header>
        {{ t('Directory Settings') }}
      </q-item-label>
      <setting-item
        :label="t('Chat Assistant')"
        :modified-in="state.chatAssistantId.modifiedIn"
        @reset="reset('chatAssistantId')"
      >
        <q-select
          :model-value="state.chatAssistantId.value"
          @update:model-value="update('chatAssistantId', $event)"
          :options="assistantOptions"
          map-options
          emit-value
          dense
          filled
        >
          <template #option="{ opt: { label, avatar }, itemProps }">
            <dense-item
              :label
              :avatar
              v-bind="itemProps"
            />
          </template>
        </q-select>
      </setting-item>
      <setting-item
        :label="t('Chat Model')"
        :modified-in="state.chatModelId.modifiedIn"
        @reset="reset('chatModelId')"
      >
        <model-select
          :workspace-id="workspaceStore.id"
          :model-value="state.chatModelId.value"
          @update:model-value="update('chatModelId', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Translation Model')"
        :modified-in="state.translationModelId.modifiedIn"
        @reset="reset('translationModelId')"
      >
        <model-select
          :workspace-id="workspaceStore.id"
          :model-value="state.translationModelId.value"
          @update:model-value="update('translationModelId', $event)"
          dense
          filled
        />
      </setting-item>
      <setting-item
        :label="t('Chat Title Model')"
        :caption="t('Model used to generate chat title')"
        :modified-in="state.chatTitleModelId.modifiedIn"
        @reset="reset('chatTitleModelId')"
      >
        <model-select
          :workspace-id="workspaceStore.id"
          :model-value="state.chatTitleModelId.value"
          @update:model-value="update('chatTitleModelId', $event)"
          dense
          filled
        />
      </setting-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { useThisEntityConf } from 'src/composables/entity-conf'
import { computed, provide } from 'vue'
import SettingItem from 'src/components/SettingItem.vue'
import ModelSelect from 'src/components/ModelSelect.vue'
import { entityAvatar, entityName } from 'src/utils/defaults'
import type { SettingsScope } from 'src/utils/types'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import CommonItem from 'src/components/CommonItem.vue'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import DenseItem from 'src/components/DenseItem.vue'

const props = defineProps<{
  id: string
}>()

const { entity, ancestors, state, update, reset } = useThisEntityConf()

provide('scopes', computed<SettingsScope[]>(() => ancestors.value.map(x => ({
  label: entityName(x),
  to: { query: { rightEntity: JSON.stringify({ type: 'folder', id: x.id }) } },
}))))

const workspaceStore = useWorkspaceStore()

const { data: assistants } = useQuery(() => workspaceStore.id ? queries.assistants(workspaceStore.id) : null)
const assistantOptions = computed(() => assistants.value?.map(a => ({
  avatar: entityAvatar(a.entity),
  label: entityName(a.entity),
  value: a.id,
})))

function updateEntity(updates: {
  sortPriority?: number
  hidden?: boolean
}) {
  mutate(mutators.updateEntity({
    id: props.id,
    ...updates,
  }))
}
</script>
