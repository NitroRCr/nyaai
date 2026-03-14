<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 400px)">
      <q-card-section>
        <div class="text-h6">
          {{ title || t('Select Items') }}
        </div>
      </q-card-section>
      <q-card-section
        py-0
        px-2
      >
        <entity-list
          v-model="dirId"
          :selected
          @entity-click="selected.add($event.id)"
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
          @click="onDialogOK(Array.from(selected))"
          :disable="!selected.size"
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
}>()

defineEmits([
  ...useDialogPluginComponent.emits,
])

const workspaceStore = useWorkspaceStore()
const dirId = ref(workspaceStore.id!)

const selected = ref<Set<string>>(new Set())

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
