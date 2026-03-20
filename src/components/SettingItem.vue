<template>
  <q-item>
    <div
      v-if="modifiedIn != null"
      pos-absolute
      top-0
      left-0
      h-full
      border-l="solid 3px"
      :class="modifiedIn === scopes.length - 1 ? 'border-l-pri' : 'border-l-sec-c'"
    />
    <q-item-section
      avatar
      v-if="icon"
    >
      <q-icon :name="icon" />
    </q-item-section>
    <q-item-section
      grow-0
      min-w-fit
    >
      <q-item-label>{{ label }}</q-item-label>
      <q-item-label
        caption
        v-if="caption"
      >
        {{ caption }}
      </q-item-label>
      <q-item-label
        caption
        italic
        v-if="modifiedIn != null"
      >
        <span v-if="modifiedIn === scopes.length - 1">
          {{ t('Modified.') }}
          <span
            pri-link
            @click.prevent.stop="$emit('reset')"
          >{{ t('Reset') }}</span>
        </span>
        <span v-else>
          {{ t('Modified in') }}
          <router-link
            pri-link
            @click.stop
            :to="scopes[modifiedIn].to"
          >{{ scopes[modifiedIn].label }}</router-link>
        </span>
      </q-item-label>
    </q-item-section>
    <q-item-section
      side
      grow-1
      ml-a
    >
      <slot />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import type { SettingsScope } from 'src/utils/types'
import type { Ref } from 'vue'
import { inject } from 'vue'

defineProps<{
  label: string
  caption?: string
  icon?: string
  modifiedIn: number | null
}>()

defineEmits<{
  reset: []
}>()

const scopes = inject<Ref<SettingsScope[]>>('scopes')!
</script>
