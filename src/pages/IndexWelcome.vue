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
        <div mt-2>
          {{ t('Get started by clicking one of the shortcuts in the left sidebar.') }}
        </div>
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item-label header>
            {{ t('More') }}
          </q-item-label>
          <q-item
            href="https://github.com/NitroRCr/nyaai"
            target="_blank"
            rd
          >
            <q-item-section
              avatar
            >
              <a-avatar :avatar="{ type: 'svg', name: 'github' }" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ t('GitHub') }}</q-item-label>
              <q-item-label caption>
                {{ t('View source code & report issues & star us') }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            href="https://zread.ai/NitroRCr/nyaai"
            target="_blank"
            rd
          >
            <q-item-section avatar>
              <a-avatar :avatar="{ type: 'icon', icon: 'sym_o_book_2' }" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ t('Learn more details') }}</q-item-label>
              <q-item-label caption>
                {{ t('Ask AI on Zread to learn more details') }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>

<script setup lang="ts">
import AAvatar from 'src/components/AAvatar.vue'
import WelcomeWrapper from './WelcomeWrapper.vue'
import { t } from 'src/utils/i18n'
</script>
