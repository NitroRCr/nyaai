<template>
  <div>
    <dense-item
      v-if="assistant"
      clickable
      :label="entityName(assistant.entity)"
      :avatar="entityAvatar(assistant.entity)"
      rd
    />
    <q-menu>
      <q-list>
        <dense-item
          v-for="a of assistants"
          :key="a.id"
          clickable
          :label="entityName(a.entity)"
          :avatar="entityAvatar(a.entity)"
          @click="assistantId = a.id"
          v-close-popup
        />
      </q-list>
    </q-menu>
  </div>

  <div
    text-on-sur-var
    my-2
    of-hidden
    whitespace-nowrap
    text-ellipsis
    cursor-pointer
  >
    <q-icon
      name="sym_o_neurology"
      size="24px"
    />
    <code
      bg-sur-c-high
      px="6px"
      py="3px"
      text="xs"
    >{{ modelName(modelMap[modelId ?? assistant?.modelId ?? conf.chatModelId!]) }}</code>
    <q-menu important:max-w="300px">
      <q-list>
        <template v-if="assistant?.modelId">
          <q-item-label
            header
            py-2
          >
            {{ t('Assistant Model') }}
          </q-item-label>
          <dense-item
            :label="modelName(modelMap[assistant.modelId])"
            :avatar="modelAvatar(modelMap[assistant.modelId])"
            :caption="modelMap[assistant.modelId]?.caption"
            @click="modelId = null"
            :active="!modelId"
            clickable
            v-close-popup
          />
        </template>
        <template v-else-if="conf.chatModelId">
          <q-item-label
            header
            py-2
          >
            {{ t('Default Model') }}
          </q-item-label>
          <dense-item
            :label="modelName(modelMap[conf.chatModelId])"
            :avatar="modelAvatar(modelMap[conf.chatModelId])"
            :caption="modelMap[conf.chatModelId]?.caption"
            @click="modelId = null"
            :active="!modelId"
            clickable
            v-close-popup
          />
        </template>
        <template v-if="workspaceModels.length">
          <q-item-label
            header
            py-2
          >
            {{ t('Workspace Models') }}
          </q-item-label>
          <dense-item
            v-for="model of workspaceModels"
            :key="model.id"
            clickable
            :label="modelName(model)"
            :avatar="modelAvatar(model)"
            :caption="model.caption"
            @click="modelId = model.id"
            :active="modelId === model.id"
            v-close-popup
          />
        </template>
        <template v-if="publicModels.length">
          <q-item-label
            header
            py-2
          >
            {{ t('Platform Models') }}
          </q-item-label>
          <dense-item
            v-for="model of publicModels"
            :key="model.id"
            clickable
            :label="modelName(model)"
            :avatar="modelAvatar(model)"
            :caption="model.caption"
            @click="modelId = model.id"
            :active="modelId === model.id"
            v-close-popup
          />
        </template>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup lang="ts">
import { entityAvatar, entityName, modelAvatar, modelName } from 'src/utils/defaults'
import { queries } from 'app/src-shared/queries'
import DenseItem from './DenseItem.vue'
import { useQuery } from 'src/composables/zero/query'
import { t } from 'src/utils/i18n'
import type { EntityConf } from 'src/composables/entity-conf'
import { arrayToMap } from 'src/utils/functions'
import { computed } from 'vue'

const props = defineProps<{
  workspaceId: string
  conf: EntityConf
}>()

const assistantId = defineModel<string | null>('assistantId', { required: true })
const modelId = defineModel<string | null>('modelId', { required: true })

const { data: assistants } = useQuery(() => queries.assistants(props.workspaceId))
const assistant = computed(() => assistants.value.find(a => a.id === assistantId.value))

const { data: workspaceModels } = useQuery(() => queries.models(props.workspaceId))
const { data: publicModels } = useQuery(() => queries.publicModels())

const modelMap = computed(() => arrayToMap(workspaceModels.value.concat(publicModels.value), x => x.id))
</script>
