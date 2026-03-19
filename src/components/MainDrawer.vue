<template>
  <q-drawer
    show-if-above
    v-model="uiStateStore.mainDrawerOpen"
    :width="uiStateStore.mainDrawerWidth"
    :breakpoint="uiStateStore.mainDrawerBreakpoint"
    bg-sur-c
    flex
    flex-col
  >
    <q-item
      v-if="user.id"
      clickable
      py-1
    >
      <q-item-section
        avatar
        pr-3
        ml--1
      >
        <a-avatar :avatar="workspaceAvatar(workspaceStore.workspace)" />
      </q-item-section>
      <q-item-section>
        <q-item-label v-if="workspaceStore.workspace">
          {{ workspaceStore.workspace.name }}
        </q-item-label>
        <q-item-label
          v-else
          text-warn
        >
          {{ t('No workspace selected') }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-icon name="sym_o_keyboard_arrow_down" />
      </q-item-section>
      <q-menu>
        <workspace-menu-list />
      </q-menu>
    </q-item>
    <q-item
      v-else
      to="/auth/sign-in"
    >
      <q-item-section
        avatar
        min-w-0
      >
        <q-icon name="sym_o_login" />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ t('Sign In / Sign Up') }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-separator spaced />
    <right-entity-list
      v-if="dirId"
      v-model="dirId"
      mode="left"
    />
    <q-space />
    <q-list
      p-2
      text-on-sur-var
    >
      <q-item
        clickable
        to="/published"
        item-rd
        min-h="40px"
      >
        <q-item-section avatar>
          <q-icon name="sym_o_publish" />
        </q-item-section>
        <q-item-section>
          {{ t('Published Items') }}
        </q-item-section>
      </q-item>
      <q-item
        clickable
        to="/trash"
        item-rd
        min-h="40px"
      >
        <q-item-section avatar>
          <q-icon name="sym_o_delete" />
        </q-item-section>
        <q-item-section>
          {{ t('Trash') }}
        </q-item-section>
      </q-item>
      <q-separator spaced />
      <div
        flex
        text-on-sur-var
        items-center
      >
        <q-btn
          icon="sym_o_settings"
          :label="t('Settings')"
          to="/settings"
          :class="{ 'route-active': $route.path === '/settings'}"
          flat
          no-caps
        />
        <q-space />
        <dark-switch-btn />
        <q-btn
          flat
          dense
          round
          icon="sym_o_more_vert"
        >
          <q-menu>
            <q-list>
              <dense-item
                clickable
                :avatar="{ type: 'svg', name: 'github' }"
                label="GitHub"
                href="https://github.com/NitroRCr/nyaai"
                target="_blank"
              />
              <menu-item
                icon="sym_o_book_2"
                label="Zread"
                href="https://zread.ai/NitroRCr/nyaai"
                target="_blank"
              />
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-list>
  </q-drawer>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useUiStateStore } from 'src/stores/ui-state'
import AAvatar from './AAvatar.vue'
import { workspaceAvatar } from 'src/utils/defaults'
import WorkspaceMenuList from './WorkspaceMenuList.vue'
import RightEntityList from './RightEntityList.vue'
import { ref } from 'vue'
import { until } from '@vueuse/core'
import MenuItem from './MenuItem.vue'
import DenseItem from './DenseItem.vue'
import DarkSwitchBtn from './DarkSwitchBtn.vue'
import { user } from 'src/utils/zero-session'

const uiStateStore = useUiStateStore()
const workspaceStore = useWorkspaceStore()

const dirId = ref<string | null>(null)
until(() => workspaceStore.member).toBeTruthy().then(({ leftDirId }) => {
  dirId.value = leftDirId
})
</script>
