<template>
  <div
    v-if="store.settings?.tosLink && store.settings?.privacyPolicyLink"
    text="on-sur-var xs"
  >
    {{ t('By continuing, you agree to our') }}
    <a
      :href="store.settings.tosLink"
      target="_blank"
      text-on-sur-var
      decoration="underline out offset-2"
    >{{ t('Terms of Service') }}</a>
    {{ t('and') }}
    <a
      :href="store.settings.privacyPolicyLink"
      target="_blank"
      text-on-sur-var
      decoration="underline out offset-2"
    >{{ t('Privacy Policy') }}</a>
  </div>
</template>

<script setup lang="ts">
import { useGlobalSettingsStore } from 'src/stores/global-settings'
import { t } from 'src/utils/i18n'

const store = useGlobalSettingsStore()
</script>
