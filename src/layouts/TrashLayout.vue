<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStateStore.toggleMainDrawer"
      />
      <q-toolbar-title>{{ t('Trash') }}</q-toolbar-title>
      <q-space />
      <entity-list-options-btn
        v-model="listOptions"
        flat
        dense
        round
      />
      <q-btn
        icon="sym_o_delete_forever"
        :title="t('Empty Trash')"
        @click="emptyTrash"
        hover:text-err
        flat
        dense
        round
      />
    </q-toolbar>
  </q-header>
  <q-page-container>
    <q-page :style-fn="pageFhStyle">
      <trash-list
        v-if="workspaceStore.id"
        :workspace-id="workspaceStore.id"
        :list-options
        h-full
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { useUiStateStore } from 'src/stores/ui-state'
import TrashList from 'src/components/TrashList.vue'
import { ref } from 'vue'
import type { EntityListOptions } from 'app/src-shared/utils/validators'
import { useWorkspaceStore } from 'src/stores/workspace'
import EntityListOptionsBtn from 'src/components/EntityListOptionsBtn.vue'
import { useQuasar } from 'quasar'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import { pageFhStyle } from 'src/utils/functions'
import { useRequireLogin } from 'src/composables/require-login'

useRequireLogin()

const uiStateStore = useUiStateStore()
const workspaceStore = useWorkspaceStore()
const listOptions = ref<EntityListOptions>({
  type: null,
  hidden: null,
  orderBy: ['id', 'desc'],
})

const $q = useQuasar()
function emptyTrash() {
  $q.dialog({
    title: t('Empty Trash'),
    message: t('Are you sure you want to empty the trash? All items in the trash will be deleted permanently.'),
    cancel: true,
    ok: {
      label: t('Delete'),
      color: 'negative',
      flat: true,
    },
  }).onOk(() => {
    mutate(mutators.deleteEntities({
      workspaceId: workspaceStore.id!,
    }))
  })
}
</script>
