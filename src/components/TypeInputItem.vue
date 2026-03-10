<template>
  <q-item>
    <q-item-section>
      <q-item-label>
        {{ schema.title }}
      </q-item-label>
      <q-item-label
        caption
        v-if="schema.description"
      >
        {{ schema.description }}
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <component
        :is="Input"
        v-if="schema.type === 'string'"
        :style="{ width: schema.width }"
        :type="schema.format"
        :model-value="modelValue"
        @update:model-value="update"
        :placeholder="schema.placeholder"
        dense
        :filled
      />
      <component
        :is="Input"
        v-else-if="schema.type === 'number'"
        type="number"
        :model-value="modelValue"
        @update:model-value="update"
        :placeholder="schema.placeholder"
        dense
        :filled
      />
      <q-toggle
        v-else-if="schema.type === 'boolean'"
        :model-value="modelValue"
        @update:model-value="update"
        dense
        :filled
      />
      <q-select
        v-else-if="schema.type === 'enum'"
        :model-value="modelValue"
        @update:model-value="update"
        :options="schema.options"
        :placeholder="schema.placeholder"
        dense
        :filled
        class="min-w-80px"
      />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import type { TypeSchema } from 'src/utils/types'
import { computed } from 'vue'
import LazyInput from './LazyInput.vue'
import AInput from './AInput'

const props = defineProps<{
  schema: TypeSchema
  modelValue: any
  lazy?: boolean
  filled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

function update(value: any) {
  const isEmpty = value == null || value === ''
  emit('update:modelValue', isEmpty ? undefined : value)
}

const Input = computed(() => props.lazy ? LazyInput : AInput)
</script>
