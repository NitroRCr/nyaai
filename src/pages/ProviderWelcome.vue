<template>
  <welcome-wrapper>
    <q-card
      flat
      bg-sur
      max-w="600px"
    >
      <q-card-section>
        <div class="text-h5">
          {{ t('Custom Providers') }}
        </div>
      </q-card-section>
      <q-card-section>
        <div>
          {{ t("We offer some out-of-the-box models, but these will consume workspace's AI quota based on usage. Custom model providers, on the other hand, allow you to add any custom models without consuming workspace AI quota.") }}
        </div>
        <div mt-2>
          {{ t("Note that the provider added here can be seen and used by all workspace members. It is recommended that you set a usage limit for the API key at your provider to avoid unexpected costs.") }}
        </div>
        <div
          mt-2
          v-html="hint"
        />
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item-label header>
            {{ t('More') }}
          </q-item-label>
          <common-item
            :label="t('View platform models')"
            :caption="t('Browse the out-of-the-box models we offer and their pricing')"
            to="/models"
            rd
          />
        </q-list>
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>

<script setup lang="ts">
import CommonItem from 'src/components/CommonItem.vue'
import WelcomeWrapper from './WelcomeWrapper.vue'
import { t } from 'src/utils/i18n'

const hint = t('Click <strong>"New Provider"</strong> in the right sidebar to add a custom provider.')
</script>
