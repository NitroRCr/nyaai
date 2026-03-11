<template>
  <q-expansion-item
    bg-sur-c-low
    of-hidden
    rd-md
    v-if="plugin"
  >
    <template #header>
      <q-item-section avatar>
        <a-avatar :avatar="plugin.avatar" />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          {{ plugin.name }}<code bg-sur-c-high>{{ toolCall.name }}</code>
        </q-item-label>
        <q-item-label caption>
          {{ t('Tool Call') }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-spinner
          v-if="toolCall.status === 'calling'"
          size="sm"
        />
        <q-icon
          v-else-if="toolCall.status === 'completed'"
          name="sym_o_check_circle"
          text-suc
        />
        <q-icon
          v-else-if="toolCall.status === 'failed'"
          name="sym_o_error"
          text-err
        />
      </q-item-section>
    </template>
    <template #default>
      <md-preview
        :model-value="contentMd"
        v-bind="mdPreviewProps"
        bg-sur-c-low
      />
    </template>
  </q-expansion-item>
</template>

<script setup lang="ts">
import { usePluginsStore } from 'src/stores/plugins'
import { computed } from 'vue'
import AAvatar from './AAvatar.vue'
import { engine } from 'src/utils/template-engine'
import { MdPreview } from 'md-editor-v3'
import { Row } from '@rocicorp/zero'
import { t } from 'src/utils/i18n'
import { useMdProps } from 'src/composables/md-props'

const props = defineProps<{
  toolCall: Row['toolCall']
}>()

const pluginsStore = usePluginsStore()
const plugin = computed(() => pluginsStore.plugins.find(p => p.id === props.toolCall.pluginId))

const contentTemplate =
`### ${t('Tool Input')}

\`\`\`json
{{ toolCall.input | json: 2 }}
\`\`\`

{%- if toolCall.result %}
### ${t('Tool Result')}

\`\`\`json
{{ toolCall.result | json: 2 }}
\`\`\`
{%- endif %}

{%- if toolCall.error %}
### ${t('Error Message')}

{{ toolCall.error }}
{%- endif %}
`
const contentMd = computed(() => {
  return engine.parseAndRenderSync(contentTemplate, {
    toolCall: props.toolCall,
  })
})

const { mdPreviewProps } = useMdProps()
</script>
