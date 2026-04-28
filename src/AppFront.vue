<template>
  <q-layout view="lHr Lpr lFf">
    <main-drawer />
    <router-view />
    <navigation-dialog
      v-if="workspaceStore.id"
      v-model="panelOpen"
    />
    <search-entity-dialog
      v-if="workspaceStore.id"
      v-model="uiStateStore.searchDialogOpen"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MainDrawer from './components/MainDrawer.vue'
import { useSetTheme } from './composables/set-theme'
import { usePerfsStore } from './stores/perfs'
import NavigationDialog from './components/NavigationDialog.vue'
import { useListenKey } from './composables/listen-key'
import { useWorkspaceStore } from './stores/workspace'
import { useRouter } from 'vue-router'
import { waitingWorker } from 'app/src-pwa/register-service-worker'
import SearchEntityDialog from './components/SearchEntityDialog.vue'
import { useUiStateStore } from './stores/ui-state'

const perfsStore = usePerfsStore()
useSetTheme(computed(() => perfsStore.perfs.themeHue))

const workspaceStore = useWorkspaceStore()
const panelOpen = ref(false)
useListenKey(computed(() => perfsStore.perfs.navigationPanelShortcut), () => {
  panelOpen.value = !panelOpen.value
})

const uiStateStore = useUiStateStore()
useListenKey(computed(() => perfsStore.perfs.searchWorkspaceKey), () => {
  uiStateStore.searchDialogOpen = !uiStateStore.searchDialogOpen
})

const router = useRouter()
router.beforeEach((to, from) => {
  if (waitingWorker && to.path !== from.path) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      location.href = to.fullPath
    }, { once: true })
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    // Prevent hanging
    setTimeout(() => {
      location.href = to.fullPath
    }, 3000)
    return false
  }
})
</script>
