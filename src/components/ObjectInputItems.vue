<template>
  <type-input-item
    v-for="(s, key) in schema"
    :key
    :schema="s"
    :model-value="modelValue[key]"
    @update:model-value="$emit('update:modelValue', { ...modelValue, [key]: $event })"
    :lazy
    :filled
  />
</template>

<script setup lang="ts" generic="S extends ObjectSchema">
import type { InferSchema, ObjectSchema } from 'src/utils/types'
import TypeInputItem from './TypeInputItem.vue'

defineProps<{
  schema: S
  lazy?: boolean
  filled?: boolean
  modelValue: InferSchema<S>
}>()
defineEmits<{
  'update:modelValue': [value: InferSchema<S>]
}>()
</script>
