<template>
  <q-header bg-sur>
    <q-toolbar>
      <q-btn
        v-if="!uiStateStore.mainDrawerAbove"
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStateStore.toggleMainDrawer"
        text-on-sur-var
      />

      <q-btn
        v-if="!uiStateStore.rightDrawerAbove"
        flat
        dense
        round
        icon="sym_o_segment"
        @click="uiStateStore.toggleRightDrawer"
        text-on-sur-var
        ml-a
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
      <form
        @submit.prevent="search"
        w="600px"
        max-w="90vw"
      >
        <q-input
          outlined
          v-model="q"
          autofocus
          enterkeyhint="search"
          :placeholder="t('Search the web...')"
        />
      </form>
      <div h="100px" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { createSearch } from 'src/services/create-search'
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRightDirStore } from 'src/stores/right-dir'
import { t } from 'src/utils/i18n'
import { useUiStateStore } from 'src/stores/ui-state'

const q = ref('')

const router = useRouter()
const rightDirStore = useRightDirStore()
async function search() {
  const id = await createSearch(q.value, rightDirStore.dirId!)
  await router.push(`/search/${id}`)
  await nextTick()
}

const uiStateStore = useUiStateStore()
</script>
