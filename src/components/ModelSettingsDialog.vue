<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    no-refocus
  >
    <q-card style="width: min(90vw, 560)">
      <q-card-section>
        <div class="text-h6">
          {{ t('Model Settings') }}
        </div>
      </q-card-section>
      <q-card-section
        v-if="model"
        p-0
        pb-2
      >
        <q-list>
          <q-item-label
            header
            py-2
          >
            {{ t('Info') }}
          </q-item-label>
          <common-item :label="t('Name')">
            <a-input
              :model-value="model.name"
              @change="update({ name: $event as string })"
              dense
            />
          </common-item>
          <common-item
            :label="t('Icon')"
            clickable
            @click="pickAvatar"
          >
            <a-avatar :avatar="modelAvatar(model)" />
          </common-item>
          <common-item :label="t('Display Name')">
            <a-input
              :model-value="model.label"
              @change="update({ label: $event as string })"
              dense
            />
          </common-item>
          <common-item :label="t('Caption')">
            <a-input
              :model-value="model.caption"
              @change="update({ caption: $event as string })"
              dense
            />
          </common-item>
          <q-expansion-item
            :label="t('Multimodal Capabilities')"
            :caption="t('Files matching the MIME types will be directly input to the model.')"
          >
            <common-item :label="t('User input types')">
              <list-input
                class="xs:w-200px sm:w-250px"
                dense
                :model-value="inputTypes.user"
                @update:model-value="update({
                  inputTypes: {
                    ...inputTypes,
                    user: $event,
                  },
                })"
                new-value-mode="add-unique"
              />
            </common-item>
            <common-item :label="t('Assistant message types')">
              <list-input
                class="xs:w-200px sm:w-250px"
                dense
                :model-value="inputTypes.assistant"
                @update:model-value="update({
                  inputTypes: {
                    ...inputTypes,
                    assistant: $event,
                  },
                })"
                new-value-mode="add-unique"
              />
            </common-item>
            <common-item :label="t('Tool result types')">
              <list-input
                class="xs:w-200px sm:w-250px"
                dense
                :model-value="inputTypes.tool"
                @update:model-value="update({
                  inputTypes: {
                    ...inputTypes,
                    tool: $event,
                  },
                })"
                new-value-mode="add-unique"
              />
            </common-item>
          </q-expansion-item>
          <q-separator spaced />
          <q-item-label
            header
            py-2
          >
            {{ t('Parameters') }}
          </q-item-label>
          <model-params-input-items
            :model-value="model.settings"
            @update:model-value="update({ settings: $event })"
          />
          <template v-if="schema">
            <q-separator spaced />
            <q-item-label
              header
              py-2
            >
              {{ t('Provider Options') }}
            </q-item-label>
            <object-input-items
              :schema
              :model-value="model.providerOptions ?? {}"
              @update:model-value="update({ providerOptions: $event })"
            />
          </template>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { t } from 'src/utils/i18n'
import { computed } from 'vue'
import type { Row } from '@rocicorp/zero'
import CommonItem from './CommonItem.vue'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import ListInput from './ListInput.vue'
import { modelAvatar, modelInputTypes } from 'src/utils/defaults'
import AInput from './AInput'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import ModelParamsInputItems from './ModelParamsInputItems.vue'
import AAvatar from './AAvatar.vue'
import PickAvatarDialog from './PickAvatarDialog.vue'
import { useProviderOptionsSchema } from 'src/composables/provider-options-schema'
import ObjectInputItems from './ObjectInputItems.vue'

defineEmits([
  ...useDialogPluginComponent.emits,
])

const props = defineProps<{
  id: string
}>()

const { data: model } = useQuery(() => queries.fullModel(props.id))

const inputTypes = computed(() => modelInputTypes(model.value))

const { dialogRef, onDialogHide } = useDialogPluginComponent()

function update(updates: Partial<Row['model']>) {
  mutate(mutators.updateModel({
    id: props.id,
    ...updates,
  }))
}

const $q = useQuasar()
function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      defaultTab: 'ai',
      model: modelAvatar(model.value),
      parentId: model.value!.entityId,
    },
  }).onOk(avatar => {
    update({ avatar })
  })
}

const { schema } = useProviderOptionsSchema(model)
</script>
