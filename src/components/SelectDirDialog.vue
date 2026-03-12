<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 400px)">
      <q-card-section>
        <div class="text-h6">
          {{ title || t('Select Directory') }}
        </div>
      </q-card-section>
      <q-card-section py-0>
        <entity-list
          v-model="dirId"
          @entity-click="dirId = $event.id"
          :exclude
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="t('Cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="t('OK')"
          @click="onDialogOK(dirId)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { t } from 'src/utils/i18n'
import EntityList from './EntityList.vue'
import { useWorkspaceStore } from 'src/stores/workspace'
import { ref } from 'vue'

defineProps<{
  title?: string
  exclude?: string[]
}>()

defineEmits([
  ...useDialogPluginComponent.emits,
])

const workspaceStore = useWorkspaceStore()
const dirId = ref(workspaceStore.id!)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
