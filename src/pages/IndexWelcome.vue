<template>
  <welcome-wrapper>
    <q-card
      flat
      bg-sur
      max-w="600px"
    >
      <q-card-section>
        <div class="text-h5">
          {{ t('Welcome to Nya AI') }}
        </div>
      </q-card-section>
      <q-card-section>
        <div>
          {{ t('This is your workspace. Here, all content is organized in a file system-like manner, and you can browse all directories in the right sidebar.') }}
        </div>
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item-label header>
            {{ t('Getting started') }}
          </q-item-label>
          <dense-item
            :avatar="typeAvatar('chat')"
            :label="t('Chat')"
            :caption="t('Chat with AI')"
            clickable
            @click="goto('chat')"
            rd
            h="48px"
          />
          <dense-item
            :avatar="typeAvatar('search')"
            :label="t('Search')"
            :caption="t('Search the web with AI')"
            clickable
            @click="goto('search')"
            rd
            h="48px"
          />
          <dense-item
            :avatar="typeAvatar('page')"
            :label="t('Pages')"
            :caption="t('Take notes & collaborate')"
            clickable
            @click="goto('page')"
            rd
            h="48px"
          />
        </q-list>
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item-label header>
            {{ t('More') }}
          </q-item-label>
          <dense-item
            :avatar="{ type: 'svg', name: 'github' }"
            :label="t('GitHub')"
            :caption="t('View source code & report issues & star us')"
            href="https://github.com/NitroRCr/nyaai"
            target="_blank"
            rd
            h="48px"
          />
          <dense-item
            :avatar="{ type: 'icon', icon: 'sym_o_book_2' }"
            :label="t('Docs')"
            :caption="t('Learn more about the features')"
            href="https://docs.nyaai.cc"
            target="_blank"
            rd
            h="48px"
          />
        </q-list>
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>

<script setup lang="ts">
import WelcomeWrapper from './WelcomeWrapper.vue'
import { t } from 'src/utils/i18n'
import type { EntityType } from 'app/src-shared/utils/validators'
import { useActiveEntitiesStore } from 'src/stores/active-entities'
import { useRunShortcut } from 'src/composables/run-shortcut'
import DenseItem from 'src/components/DenseItem.vue'
import { typeAvatar } from 'app/src-shared/utils/functions'

const activeEntitiesStore = useActiveEntitiesStore()
const runShortcut = useRunShortcut()

function goto(type: EntityType) {
  const shortcut = activeEntitiesStore.shortcuts.find(s => s.type === type)
  shortcut && runShortcut(shortcut)
}
</script>
