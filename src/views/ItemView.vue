<template>
  <div
    view-styles
    flex="~ col"
  >
    <common-toolbar>
      <q-toolbar-title text-lg>
        {{ entityName(entity) }}
      </q-toolbar-title>
      <q-btn
        icon="sym_o_more_vert"
        text-on-sur-var
        flat
        dense
        round
        ml-a
      >
        <q-menu>
          <q-list>
            <menu-item
              :label="t('Download')"
              icon="sym_o_download"
              @click="download"
            />
            <menu-item
              :label="t('Download link')"
              icon="sym_o_link"
              @click="copyDownloadLink"
            />
          </q-list>
        </q-menu>
      </q-btn>
    </common-toolbar>

    <q-tabs
      v-model="tab"
      active-color="primary"
      align="left"
      no-caps
      :breakpoint="0"
      dense
    >
      <q-tab
        v-if="previewMode"
        name="preview"
        :label="t('Preview')"
      />
      <q-tab
        v-if="item.text != null"
        name="text"
        :label="t('Text')"
      />
      <q-tab
        v-if="item.blobId"
        name="file"
        :label="t('File')"
      />
    </q-tabs>
    <div
      of-y-auto
      grow
    >
      <div
        v-if="tab === 'preview'"
        p-2
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          max-w-full
          max-h-full
        >
        <img
          v-else-if="previewMode === 'svg'"
          :src="`data:image/svg+xml,${encodeURIComponent(item.text!)}`"
          max-w-full
          max-h-full
        >
        <md-preview
          v-else-if="previewMode === 'markdown'"
          :model-value="item.text!"
          v-bind="mdPreviewProps"
          bg-sur
        />
      </div>
      <div
        v-if="tab === 'text'"
        p-2
        flex="~ col"
        h="full"
      >
        <code-editor
          :model-value="itemProxy.text ?? ''"
          :language="item.language ?? undefined"
          @update:model-value="updateItemProxy({ text: $event })"
          grow
          of-y-auto
        />
        <div
          flex
          mt-2
        >
          <a-input
            :label="t('Language')"
            :model-value="item.language"
            @change="updateItem({ language: $event })"
            outlined
            dense
            class="ml-a"
          />
        </div>
      </div>
      <q-list
        v-else-if="tab === 'file'"
        py-2
      >
        <common-item :label="t('MIME Type')">
          <a-input
            :model-value="item.mimeType"
            @change="updateItem({ mimeType: $event })"
            filled
            dense
            class="min-w-120px max-w-250px"
            field-sizing-content
          />
        </common-item>
        <common-item
          v-if="item.blob"
          :label="t('Size')"
        >
          {{ formatBytes(item.blob.size) }}
        </common-item>
        <common-item
          v-if="item.blob"
          label="SHA-256"
        >
          <div
            flex
            items-center
          >
            <span>{{ textBeginning(base64ToHex(item.blob.sha256), 12) }}</span>
            <copy-btn
              :value="base64ToHex(item.blob!.sha256)"
              flat
              round
              size="sm"
            />
          </div>
        </common-item>
        <common-item :label="t('Created At')">
          {{ idDateString(item.id) }}
        </common-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mutators } from 'app/src-shared/mutators'
import type { FullItem } from 'app/src-shared/queries'
import { base64ToHex } from 'app/src-shared/utils/functions'
import { idDateString } from 'app/src-shared/utils/id'
import { copyToClipboard, exportFile, useQuasar } from 'quasar'
import CommonItem from 'src/components/CommonItem.vue'
import AInput from 'src/components/AInput'
import CopyBtn from 'src/components/CopyBtn.vue'
import MenuItem from 'src/components/MenuItem.vue'
import { useThisEntityConf } from 'src/composables/entity-conf'
import { mutate } from 'src/utils/zero-session'
import { getCached, getDownloadUrl } from 'src/utils/blob-cache'
import { entityName } from 'src/utils/defaults'
import { formatBytes, getItemUrl, textBeginning } from 'src/utils/functions'
import { t } from 'src/utils/i18n'
import { computed, ref, toRef } from 'vue'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import { useMdProps } from 'src/composables/md-props'
import { useBlobURL } from 'src/composables/blob-url'
import { MdPreview } from 'md-editor-v3'
import CodeEditor from 'src/components/CodeEditor.vue'
import { useEditProxy } from 'src/composables/state-proxy'

const props = defineProps<{
  item: FullItem
}>()

const previewMode = computed(() => {
  const { item } = props
  if (item.blobId && item.mimeType?.startsWith('image/')) {
    return 'image'
  }
  if (item.text && ['html', 'markdown'].includes(item.language ?? '')) {
    return 'markdown'
  }
  if (item.text && item.language === 'svg') {
    return 'svg'
  }
  return null
})
const tab = ref(previewMode.value ? 'preview' : props.item.blobId ? 'file' : 'text')
const imageUrl = useBlobURL(computed(() => previewMode.value === 'image' ? props.item.id : null))

const { entity } = useThisEntityConf()

function updateItem(updates: {
  text?: string
  mimeType?: string
  language?: string
}) {
  mutate(mutators.updateItem({ id: props.item.id, ...updates }))
}

async function download() {
  const cached = await getCached(props.item.id)
  const name = entityName(entity.value)
  if (cached) {
    exportFile(name, cached)
  } else {
    window.open(getItemUrl(props.item.id), '_blank')
  }
}
const $q = useQuasar()
function copyDownloadLink() {
  getDownloadUrl(props.item.id)
    .then(({ url }) => copyToClipboard(url))
    .then(() => {
      $q.notify(t('Download link copied to clipboard'))
    })
    .catch(err => {
      console.error(err)
      $q.notify(t('Failed to get download link: {0}', err.message))
    })
}

const { mdPreviewProps } = useMdProps()

const { value: itemProxy, update: updateItemProxy } = useEditProxy(
  toRef(props, 'item'),
  ['id', 'text'],
  (id, updates) => {
    mutate(mutators.updateItem({ id, ...updates }))
  },
  { type: 'debounce', wait: 1000 },
)
</script>
