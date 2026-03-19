<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
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
      <q-toolbar-title>
        {{ t('Settings') }}
      </q-toolbar-title>
    </q-toolbar>
    <q-tabs
      active-color="primary"
      align="left"
      no-caps
    >
      <q-route-tab
        v-for="({ label, to }, index) in allScopes"
        :key="index"
        :label
        :to
      />
    </q-tabs>
  </q-header>
  <q-page-container>
    <q-page>
      <settings-list
        :state
        :scope
        @update="update"
        @reset="reset"
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import SettingsList from 'src/components/SettingsList.vue'
import { usePerfsState } from 'src/composables/perfs-state'
import { t } from 'src/utils/i18n'
import { DefaultPerfs, usePerfsStore } from 'src/stores/perfs'
import type { Perfs } from 'src/stores/perfs'
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { z } from 'zod'
import { useRequireLogin } from 'src/composables/require-login'
import { useUiStateStore } from 'src/stores/ui-state'

useRequireLogin()

const route = useRoute()
const allScopes = [
  { name: 'user', label: t('User'), to: { query: {} } },
  { name: 'workspace', label: t('Workspace'), to: { query: { scope: 'workspace' } } },
  { name: 'local', label: t('Local'), to: { query: { scope: 'local' } } },
] as const

const scopeSchema = z.enum(allScopes.map(scope => scope.name)).catch('user')
const scope = computed(() => scopeSchema.parse(route.query.scope))
const scopes = computed(() => allScopes.slice(0, allScopes.findIndex(s => s.name === scope.value) + 1))
provide('scopes', scopes)

const perfsStore = usePerfsStore()
const { state } = usePerfsState(computed(() => scopes.value.map(s => perfsStore[`${s.name}Perfs`])), DefaultPerfs)

function update<K extends keyof Perfs>(key: K, value: Perfs[K]) {
  perfsStore.update({
    updates: { [key]: value },
    scope: scope.value,
  })
}
function reset(key: keyof Perfs) {
  perfsStore.update({
    deletes: [key],
    scope: scope.value,
  })
}

const uiStateStore = useUiStateStore()
</script>
