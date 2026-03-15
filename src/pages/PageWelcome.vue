<template>
  <welcome-wrapper>
    <q-card
      flat
      bg-sur
      max-w="600px"
    >
      <q-card-section>
        <div class="text-h6">
          {{ t('Pages: Notes & Collaborative Documents') }}
        </div>
      </q-card-section>
      <q-card-section>
        <div>
          {{ t('Pages can be used for personal notes, team collaboration documents, and more.') }}
        </div>
        <div mt-2>
          {{ t('Features:') }}
          <ul
            pl-4
            my-2
          >
            <li>{{ t('Full Markdown support') }}</li>
            <li>{{ t('Import from / export as .docx file') }}</li>
            <li>{{ t('Version control: Browse/revert to historical versions at any time.') }}</li>
            <li>{{ t('Publishing pages to the public internet') }}</li>
          </ul>
        </div>
        <div v-html="hint" />
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item-label header>
            {{ t('Further') }}
          </q-item-label>
          <common-item
            :label="t('Invite members')"
            :caption="t('Invite your team to this workspace for collaboration.')"
            to="/workspace"
            rd
          />
        </q-list>
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>

<script setup lang="ts">
import WelcomeWrapper from './WelcomeWrapper.vue'
import CommonItem from 'src/components/CommonItem.vue'
import { t } from 'src/utils/i18n'

const hint = t('Click <strong>"New Page"</strong> in the right sidebar to create a page.')
</script>
