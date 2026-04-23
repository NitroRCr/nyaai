import { acceptHMRUpdate, defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { computed, ref } from 'vue'

export const useUiStateStore = defineStore('ui-state', () => {
  const mainDrawerWidth = 275
  const mainDrawerBreakpoint = 1200
  const mainDrawerOpen = ref(false)
  function toggleMainDrawer() {
    mainDrawerOpen.value = !mainDrawerOpen.value
  }
  const mainDrawerAbove = computed(() => $q.screen.width > mainDrawerBreakpoint)
  const rightDrawerBreakpoint = 960
  const rightDrawerOpen = ref(false)
  function toggleRightDrawer() {
    rightDrawerOpen.value = !rightDrawerOpen.value
  }
  const $q = useQuasar()
  const rightDrawerAbove = computed(() => $q.screen.width > rightDrawerBreakpoint)
  const chatScrollTops = ref(new Map<string, number>())

  const searchDialogOpen = ref(false)
  return {
    mainDrawerWidth,
    mainDrawerBreakpoint,
    mainDrawerOpen,
    mainDrawerAbove,
    toggleMainDrawer,
    chatScrollTops,
    rightDrawerAbove,
    rightDrawerBreakpoint,
    toggleRightDrawer,
    rightDrawerOpen,
    searchDialogOpen,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUiStateStore, import.meta.hot))
}
