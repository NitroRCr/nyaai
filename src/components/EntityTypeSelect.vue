<template>
  <q-select
    v-model="model"
    :options
    map-options
    emit-value
  />
</template>

<script setup lang="ts">
import type { EntityType } from 'app/src-shared/utils/validators'
import { t } from 'src/utils/i18n'

const model = defineModel<EntityType | null>()

const options = [
  { label: t('All'), value: null },
  { label: t('Chat'), value: 'chat' },
  { label: t('Search'), value: 'search' },
  { label: t('Page'), value: 'page' },
  { label: t('File'), value: 'item' },
  { label: t('Channel'), value: 'channel' },
  { label: t('Translation'), value: 'translation' },
  { label: t('Folder'), value: 'folder' },
]
</script>
