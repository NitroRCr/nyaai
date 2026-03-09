<template>
  <div
    flex
    gap-1
  >
    <q-btn
      flat
      no-caps
      grow
      align="left"
      v-bind="mainBtnProps"
      bg-pri-c
      text-on-pri-c
      @click="createEntity(rightDirStore.dirId!, (route.params.type ?? 'folder') as EntityType)"
    />
    <q-btn
      flat
      icon="sym_o_add"
    >
      <q-menu>
        <q-list>
          <menu-item
            :label="t('Folder')"
            icon="sym_o_create_new_folder"
            @click="createEntity(rightDirStore.dirId!, 'folder')"
          />
          <q-separator />
          <menu-item
            :label="t('Chat')"
            icon="sym_o_chat_add_on"
            @click="createEntity(rightDirStore.dirId!, 'chat')"
          />
          <menu-item
            :label="t('Search')"
            icon="sym_o_zoom_in"
            to="/search"
          />
          <menu-item
            :label="t('Page')"
            icon="sym_o_note_stack_add"
            @click="createEntity(rightDirStore.dirId!, 'page')"
          />
          <menu-item
            :label="t('Translation')"
            icon="sym_o_translate"
            @click="createEntity(rightDirStore.dirId!, 'translation')"
          />
          <menu-item
            :label="t('Channel')"
            icon="sym_o_tag"
            @click="createEntity(rightDirStore.dirId!, 'channel')"
          />
          <menu-item
            :label="t('Files')"
            icon="sym_o_cloud_upload"
            @click="createEntity(rightDirStore.dirId!, 'item')"
          />
          <menu-item
            :label="t('MCP')"
            icon="sym_o_extension"
            @click="createEntity(rightDirStore.dirId!, 'mcpPlugin')"
          />
          <menu-item
            :label="t('Provider')"
            icon="sym_o_domain_add"
            @click="createEntity(rightDirStore.dirId!, 'provider')"
          />
        </q-list>
      </q-menu>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { useRightDirStore } from 'src/stores/right-dir'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import type { QBtnProps } from 'quasar'
import type { EntityType } from 'app/src-shared/utils/validators'
import MenuItem from './MenuItem.vue'
import { createEntity } from 'src/utils/create-entity'

const route = useRoute()
const rightDirStore = useRightDirStore()

const mainBtnProps = computed<Partial<QBtnProps>>(() => {
  const type = route.params.type as EntityType
  if (type === 'chat') {
    return {
      label: t('New Chat'),
      icon: 'sym_o_chat_add_on',
    }
  } else if (type === 'search') {
    return {
      label: t('New Search'),
      icon: 'sym_o_zoom_in',
      to: '/search',
      class: { 'important:route-active': route.path === '/search' },
    }
  } else if (type === 'page') {
    return {
      label: t('New Page'),
      icon: 'sym_o_note_stack_add',
    }
  } else if (type === 'translation') {
    return {
      label: t('New Translation'),
      icon: 'sym_o_add',
    }
  } else if (type === 'channel') {
    return {
      label: t('New Channel'),
      icon: 'sym_o_add',
    }
  } else if (type === 'item') {
    return {
      label: t('Upload Files'),
      icon: 'sym_o_cloud_upload',
      class: { 'important:route-active': route.path === '/item' },
    }
  } else if (type === 'provider') {
    return {
      label: t('New Provider'),
      icon: 'sym_o_domain_add',
    }
  } else if (type === 'mcpPlugin') {
    return {
      label: t('MCP Plugin'),
      icon: 'sym_o_add',
    }
  }
  return {
    label: t('New Folder'),
    icon: 'sym_o_create_new_folder',
  }
})
</script>
