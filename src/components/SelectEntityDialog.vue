<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    position="top"
    :transition-duration="200"
  >
    <q-card
      bg-sur
      style="width: min(90vw, 500px)"
      py-2
    >
      <select-entity-panel @select="onDialogOK" />
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import SelectEntityPanel from './SelectEntityPanel.vue'

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>
