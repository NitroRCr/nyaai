<template>
  <common-item
    :label="t('Max Retries')"
    :caption="t('Maximum number of retries when generation fails')"
  >
    <a-input
      class="w-100px"
      :filled
      dense
      :model-value="modelValue.maxRetries"
      @update:model-value="$emit('update:modelValue', { ...modelValue, maxRetries: parseNumber($event) })"
      type="number"
      placeholder="2"
    />
  </common-item>
  <common-item
    :label="t('Max Steps')"
    :caption="t('Maximum number of steps to generate a single reply (initial generation + tool calls)')"
  >
    <a-input
      class="w-100px"
      :filled
      dense
      :model-value="modelValue.maxSteps"
      @update:model-value="$emit('update:modelValue', { ...modelValue, maxSteps: parseNumber($event) })"
      type="number"
      placeholder="20"
    />
  </common-item>
  <common-item :label="t('Tool Choice')">
    <q-select
      :model-value="modelValue.toolChoice ?? 'auto'"
      @update:model-value="$emit('update:modelValue', { ...modelValue, toolChoice: $event })"
      :options="[
        { label: t('Auto'), value: 'auto' },
        { label: t('Required'), value: 'required' },
        { label: t('None'), value: 'none' },
      ]"
      map-options
      emit-value
      dense
      :filled
      class="min-w-100px"
    />
  </common-item>
</template>

<script setup lang="ts">
import type { GenerationSettings } from 'app/src-shared/utils/types'
import AInput from './AInput'
import CommonItem from './CommonItem.vue'
import { t } from 'src/utils/i18n'

defineProps<{
  modelValue: GenerationSettings
  filled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: GenerationSettings]
}>()

function parseNumber(val: string) {
  return parseFloat(val) || undefined
}
</script>
