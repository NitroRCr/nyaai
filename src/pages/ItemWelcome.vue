<template>
  <welcome-wrapper>
    <q-card
      flat
      bg-sur
      max-w="600px"
    >
      <q-card-section>
        <div class="text-h5">
          {{ t('Files') }}
        </div>
      </q-card-section>
      <q-card-section>
        <div>
          {{ t("Nya AI can also be your cloud drive. Uploading files here brings the following benefits:") }}
        </div>
        <div>
          <ul
            pl-4
            my-2
          >
            <li>{{ t('Access anytime from any device') }}</li>
            <li>{{ t('Ready to use in chat/pages at any time') }}</li>
            <li>{{ t('Ready for full-text search of file content (for parseable types)') }}</li>
            <li>{{ t('Share publicly or share using download links') }}</li>
          </ul>
        </div>
        <div mt-2>
          {{ t('This feature is mainly designed for document-type files, but we do not limit the file types you can upload, as long as a single file does not exceed 5GB.') }}
        </div>
        <div
          mt-2
          v-html="hint"
        />
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>

<script setup lang="ts">
import WelcomeWrapper from './WelcomeWrapper.vue'
import { t } from 'src/utils/i18n'

const hint = t('Click <strong>"Upload Files"</strong> in the right sidebar to get started.')
</script>
