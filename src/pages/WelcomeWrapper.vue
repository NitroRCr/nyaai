<template>
  <q-header bg-sur>
    <q-toolbar>
      <q-btn
        v-if="!store.mainDrawerAbove"
        flat
        dense
        round
        icon="sym_o_menu"
        @click="store.toggleMainDrawer"
        text-on-sur-var
      />
      <q-space />
      <q-btn
        v-if="!store.rightDrawerAbove"
        flat
        dense
        round
        icon="sym_o_segment"
        @click="store.toggleRightDrawer"
        text-on-sur-var
      />
    </q-toolbar>
  </q-header>
  <q-page-container>
    <q-page
      flex
      flex-col
      items-center
      justify-center
    >
      <slot />
      <div h="100px" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useUiStateStore } from 'src/stores/ui-state'

const store = useUiStateStore()
</script>
