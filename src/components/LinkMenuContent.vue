<template>
  <div flex>
    <a-input
      v-model="link"
      dense
      ml-1
      field-sizing-content
      max-w-250px
      min-w-120px
      :placeholder="t('Enter link')"
    />
    <q-btn
      flat
      un-size="40px"
      size="sm"
      icon="sym_o_open_in_new"
      @click="openLink"
    />
    <q-btn
      flat
      un-size="40px"
      size="sm"
      icon="sym_o_delete"
      @click="link = undefined"
      v-close-popup
    />
  </div>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import AInput from './AInput'

const link = defineModel<string>()

function openLink() {
  link.value && window.open(link.value, '_blank')
}
</script>
