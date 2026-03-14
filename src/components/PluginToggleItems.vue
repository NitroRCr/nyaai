<template>
  <q-item
    v-for="{ id, type, name, avatar, description } of store.plugins"
    :key="id"
    clickable
    @click="$emit(
      'update:modelValue',
      modelValue.includes(id) ? modelValue.filter(x => x !== id) : [...modelValue, id]
    )"
    py-1
    important:min-h="48px"
  >
    <q-item-section
      avatar
      min-w-0
      pr-3
      ml--1
    >
      <a-avatar
        :avatar
        size="30px"
      />
    </q-item-section>
    <q-item-section>
      <q-item-label>
        {{ name }}
        <q-badge
          :label="type === 'builtin' ? t('Built-in') : 'MCP'"
          :class="type === 'builtin' ? 'bg-pri-c text-on-pri-c' : 'bg-ter-c text-on-ter-c'"
          ml-1
        />
      </q-item-label>
      <q-item-label
        v-if="!status"
        caption
      >
        {{ description }}
      </q-item-label>
      <q-item-label
        v-else-if="modelValue.includes(id)"
        caption
      >
        {{ statusText(status[id]) }}
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <q-checkbox
        :model-value="modelValue.includes(id)"
        @update:model-value="$emit(
          'update:modelValue',
          $event ? [...modelValue, id] : modelValue.filter(x => x !== id)
        )"
        dense
      />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import type { PluginStatus } from 'src/composables/plugins'
import { usePluginsStore } from 'src/stores/plugins'
import { t } from 'src/utils/i18n'
import AAvatar from './AAvatar.vue'

defineProps<{
  modelValue: string[]
  status?: Record<string, PluginStatus>
}>()

defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const store = usePluginsStore()

function statusText(status: PluginStatus) {
  if (status === 'starting') return t('Starting...')
  if (status === 'ready') return t('Started')
  if (status === 'failed') return t('Failed to start')
}
</script>
