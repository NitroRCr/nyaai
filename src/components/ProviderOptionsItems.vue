<template>
  <object-input-items
    v-if="schema"
    :schema
    v-model="options"
  />
</template>

<script setup lang="ts">
import { toRef, watchEffect } from 'vue'
import type { FullModel } from 'app/src-shared/queries'
import ObjectInputItems from './ObjectInputItems.vue'
import { useProviderOptionsSchema } from 'src/composables/provider-options-schema'

const props = defineProps<{
  model: FullModel
}>()

const options = defineModel<Record<string, any>>({ default: () => ({}) })

const { schema } = useProviderOptionsSchema(toRef(props, 'model'))

watchEffect(() => {
  options.value = props.model.providerOptions ?? {}
})
</script>
