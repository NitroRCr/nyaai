<template>
  <q-btn
    icon="sym_o_page_info"
    :title="t('Provider Options')"
    v-if="schema"
  >
    <q-menu
      anchor="top left"
      self="bottom left"
    >
      <q-list>
        <object-input-items
          :schema
          v-model="options"
        />
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { ref, toRef, watchEffect } from 'vue'
import type { FullModel } from 'app/src-shared/queries'
import { t } from 'src/utils/i18n'
import ObjectInputItems from './ObjectInputItems.vue'
import { useProviderOptionsSchema } from 'src/composables/provider-options-schema'

const props = defineProps<{
  model: FullModel
}>()

const options = ref<Record<string, any>>({})
const providerOptions = defineModel<Record<string, any>>('options')
const providerTools = defineModel<Record<string, any>>('tools')

const { schema, exec } = useProviderOptionsSchema(toRef(props, 'model'))

watchEffect(() => {
  options.value = props.model.providerOptions ?? {}
})

watchEffect(() => {
  const res = exec(options.value)
  providerOptions.value = res.providerOptions
  providerTools.value = res.providerTools
})
</script>
