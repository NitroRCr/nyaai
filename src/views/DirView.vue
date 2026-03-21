<template>
  <div
    view-styles
    flex="~ col"
  >
    <common-toolbar>
      <q-toolbar-title text-lg>
        {{ entityName(entity) }}
      </q-toolbar-title>
    </common-toolbar>
    <div of-y-auto>
      <q-list py-2>
        <common-item :label="t('Sort priority')">
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
            @update:model-value="updateEntity({ hidden: $event })"
          />
        </common-item>
        <q-separator spaced />
        <a-tip
          tip-key="dir-conf"
          long
          rd-0
        >
          {{ t('This configuration applies to this directory scope; different directories can have different configurations, and the configuration of an inner directory can override that of an outer directory.') }}
        </a-tip>
        <q-item-label header>
          {{ t('Directory Configuration') }}
        </q-item-label>
        <setting-item
          :label="t('Chat assistant')"
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
          :label="t('Chat model')"
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
          :label="t('Chat title model')"
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
        <setting-item
          :label="t('Translation model')"
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
          :label="t('Translation primary language')"
          :modified-in="state.translationPrimaryLanguage.modifiedIn"
          @reset="reset('translationPrimaryLanguage')"
        >
          <autocomplete-input
            :options="translationLanguageOptions"
            :model-value="state.translationPrimaryLanguage.value"
            @update:model-value="update('translationPrimaryLanguage', $event)"
            dense
            filled
          />
        </setting-item>
        <setting-item
          :label="t('Translation secondary language')"
          :modified-in="state.translationSecondaryLanguage.modifiedIn"
          @reset="reset('translationSecondaryLanguage')"
        >
          <autocomplete-input
            :options="translationLanguageOptions"
            :model-value="state.translationSecondaryLanguage.value"
            @update:model-value="update('translationSecondaryLanguage', $event)"
            dense
            filled
          />
        </setting-item>
        <setting-item
          :label="t('Translation language options')"
          :modified-in="state.translationSecondaryLanguage.modifiedIn"
          @reset="reset('translationSecondaryLanguage')"
        >
          <list-input
            :model-value="state.translationLanguageOptions.value"
            @update:model-value="update('translationLanguageOptions', $event)"
            new-value-mode="add-unique"
            filled
          />
        </setting-item>
        <setting-item
          :label="t('Search assistant prompt')"
          :modified-in="state.searchAssistantPrompt.modifiedIn"
          @reset="reset('searchAssistantPrompt')"
        >
          <a-input
            :model-value="state.searchAssistantPrompt.value"
            @change="update('searchAssistantPrompt', $event)"
            filled
            autogrow
            class="w-full"
          />
        </setting-item>
        <setting-item
          :label="t('Translation prompt')"
          :modified-in="state.translationPrompt.modifiedIn"
          @reset="reset('translationPrompt')"
        >
          <a-input
            :model-value="state.translationPrompt.value"
            @change="update('translationPrompt', $event)"
            filled
            autogrow
            class="w-full"
          />
        </setting-item>
        <setting-item
          :label="t('Chat title prompt')"
          :caption="t('The prompt used to summarize chat titles')"
          :modified-in="state.chatTitlePrompt.modifiedIn"
          @reset="reset('chatTitlePrompt')"
        >
          <a-input
            :model-value="state.chatTitlePrompt.value"
            @change="update('chatTitlePrompt', $event)"
            filled
            autogrow
            class="w-full"
          />
        </setting-item>
      </q-list>
    </div>
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
import { translationLanguageOptions } from 'src/utils/values'
import AutocompleteInput from 'src/components/AutocompleteInput.vue'
import ListInput from 'src/components/ListInput.vue'
import AInput from 'src/components/AInput'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import ATip from 'src/components/ATip.vue'

const props = defineProps<{
  id: string
}>()

const { entity, ancestors, state, update, reset } = useThisEntityConf()

provide('scopes', computed<SettingsScope[]>(() => ancestors.value.map(x => ({
  label: entityName(x),
  to: { query: { rightEntity: JSON.stringify({ type: 'folder', id: x.id }) } },
}))))

const workspaceStore = useWorkspaceStore()

const { data: assistants } = useQuery(() => workspaceStore.id ? queries.assistants({ workspaceId: workspaceStore.id }) : null)
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
