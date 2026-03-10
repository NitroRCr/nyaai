<template>
  <div
    view-styles
    flex="~ col"
  >
    <common-toolbar>
      <q-toolbar-title>
        {{ t('Edit Provider') }}
      </q-toolbar-title>
    </common-toolbar>
    <q-list>
      <q-item>
        <q-item-section>
          {{ t('Provider Type') }}
        </q-item-section>
        <q-item-section side>
          <q-select
            :model-value="provider.type"
            @update:model-value="switchType"
            :options="providerOptions"
            emit-value
            map-options
            filled
            dense
          >
            <template #option="{ opt, itemProps }">
              <dense-item
                :avatar="opt.avatar"
                :label="opt.label"
                v-bind="itemProps"
                avatar-size="24px"
              />
            </template>
          </q-select>
        </q-item-section>
      </q-item>
      <object-input-items
        :model-value="provider.settings"
        @update:model-value="updateSettings"
        :schema="providerType.schema"
        lazy
        filled
      />
      <q-separator spaced />
      <q-item-label header>
        {{ t('Models') }}
      </q-item-label>
      <model-group
        :models="props.provider.models"
        :provider-type
        @add-model="addModel"
        @get-model-list="getModelList"
      />
    </q-list>
  </div>
</template>

<script setup lang="ts">
import type { FullProvider } from 'app/src-shared/queries'
import { useQuasar } from 'quasar'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import DenseItem from 'src/components/DenseItem.vue'
import ModelGroup from 'src/components/ModelGroup.vue'
import ObjectInputItems from 'src/components/ObjectInputItems.vue'
import { t } from 'src/utils/i18n'
import { mutate } from 'src/utils/zero-session'
import { genId } from 'app/src-shared/utils/id'
import { dialogOptions } from 'src/utils/props'
import type { ProviderTypeKeys } from 'src/utils/values'
import { providerTypes } from 'src/utils/values'
import { computed } from 'vue'
import { mutators } from 'app/src-shared/mutators'

const props = defineProps<{
  provider: FullProvider
}>()

const providerType = computed(() => providerTypes[props.provider.type])
const providerOptions = Object.entries(providerTypes).map(([k, v]) => ({
  avatar: v.avatar,
  label: v.label,
  value: k,
}))
function updateSettings(settings) {
  mutate(mutators.updateProvider({
    id: props.provider.id,
    settings,
  }))
}
async function switchType(type: ProviderTypeKeys) {
  const { label, avatar, initialSettings = {} } = providerTypes[type]
  await mutate(mutators.updateProvider({
    id: props.provider.id,
    type,
    settings: initialSettings,
  })).client
  await mutate(mutators.updateEntity({
    id: props.provider.id,
    name: label,
    avatar,
  })).client
}

function addModel() {
  mutate(mutators.createModels({
    entityId: props.provider.id,
    models: [{
      id: genId(),
      name: '',
      settings: {},
    }],
  }))
}
const $q = useQuasar()
function getModelList() {
  const { settings, id: entityId } = props.provider
  providerType.value.getModelList?.(settings).then(names => {
    $q.dialog({
      title: t('Select Models'),
      options: {
        type: 'checkbox',
        model: props.provider.models.filter(m => names.includes(m.name)),
        items: names.sort().map(name => ({ label: name, value: name })),
      },
      cancel: true,
      ...dialogOptions,
    }).onOk((val: string[]) => {
      mutate(mutators.createModels({
        entityId,
        models: val.map(name => ({
          id: genId(),
          name,
          settings: {},
        })),
      }))
    })
  }).catch(err => {
    console.error(err)
    $q.notify({
      message: t('Failed to get model list: {0}', err.message),
      color: 'negative',
    })
  })
}
</script>
