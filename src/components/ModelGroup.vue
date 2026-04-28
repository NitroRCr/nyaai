<template>
  <q-item
    v-for="model in models"
    :key="model.id"
  >
    <q-item-section avatar>
      <a-avatar
        :avatar="modelAvatar(model)"
        size="36px"
      />
    </q-item-section>
    <q-item-section>
      <a-input
        :label="t('Name')"
        :model-value="model.name"
        @change="updateModelName(model.id, $event ?? '')"
        dense
      />
    </q-item-section>
    <q-item-section side>
      <div flex>
        <q-btn
          flat
          dense
          round
          icon="sym_o_tune"
          @click="openModelSettings(model.id)"
          :title="t('Model Settings')"
        />
        <q-btn
          flat
          dense
          round
          icon="sym_o_delete"
          @click="deleteModel(model.id)"
          :title="t('Delete Model')"
        />
      </div>
    </q-item-section>
  </q-item>
  <q-item>
    <q-item-section>
      <div
        flex
        gap-2
        justify-end
      >
        <q-btn
          icon="sym_o_add"
          @click="$emit('addModel')"
          :label="t('Add Model')"
          flat
          no-caps
          bg-pri-c
          text-on-pri-c
        />
        <q-btn
          v-if="providerType.getModelList"
          icon="sym_o_forms_add_on"
          @click="$emit('getModelList')"
          :label="t('Get Model List')"
          flat
          no-caps
          bg-pri-c
          text-on-pri-c
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import AAvatar from './AAvatar.vue'
import { modelAvatar } from 'src/utils/defaults'
import { mutate } from 'src/utils/zero-session'
import { t } from 'src/utils/i18n'
import type { ProviderType } from 'src/utils/values'
import { mutators } from 'app/src-shared/mutators'
import type { Row } from '@rocicorp/zero'
import { useQuasar } from 'quasar'
import ModelSettingsDialog from './ModelSettingsDialog.vue'
import AInput from './AInput'

defineProps<{
  models: ReadonlyArray<Row['model']>
  providerType: ProviderType<any>
}>()
defineEmits<{
  addModel: []
  getModelList: []
}>()

function updateModelName(id: string, name: string) {
  mutate(mutators.updateModel({ id, name }))
}
function deleteModel(id: string) {
  mutate(mutators.deleteModel(id))
}

const $q = useQuasar()
function openModelSettings(id: string) {
  $q.dialog({
    component: ModelSettingsDialog,
    componentProps: {
      id,
    },
  })
}
</script>
