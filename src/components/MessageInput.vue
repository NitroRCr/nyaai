<template>
  <div
    p-2
    pos-relative
    bg-sur-c-low
  >
    <div
      v-if="message.entities.length"
      pos-absolute
      z-3
      top-0
      left-0
      right-0
      translate-y="-100%"
      flex
      items-end
      p-2
      gap-2
      of-x-auto
    >
      <message-image
        v-for="entity of message.entities.filter(i => i.item?.mimeType?.startsWith('image/'))"
        :key="entity.id"
        :entity
        removable
        h="100px"
        shrink-0
        @remove="removeItem(entity.id)"
        shadow
      />
      <message-entity
        v-for="entity of message.entities.filter(i => !i.item?.mimeType?.startsWith('image/'))"
        :key="entity.id"
        :entity
        removable
        @remove="removeItem(entity.id)"
        shadow
      />
    </div>
    <div
      flex
      items-center
      text-on-sur-var
    >
      <q-btn
        flat
        icon="sym_o_image"
        :title="t('Add Image')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="imageInput?.click()"
      >
        <input
          ref="imageInput"
          type="file"
          multiple
          accept="image/*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>
      <q-btn
        flat
        icon="sym_o_folder"
        :title="t('Add File')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>
      <plugin-context-btn
        v-if="plugins"
        :plugins
        @add-item="addItem"
        @add-files="addFiles"
        flat
        round
      />
      <slot :empty />
    </div>
    <a-input
      ref="messageInput"
      class="mt-2"
      max-h-50vh
      of-y-auto
      :model-value="editableMessage.text"
      @update:model-value="updateEditableMessage({ text: $event ?? '' })"
      outlined
      autogrow
      clearable
      :placeholder="t('Enter chat content...')"
      @keydown.enter="onEnter"
      @paste="onTextPaste"
    />
  </div>
</template>

<script setup lang="ts">
import { upload } from 'src/utils/blob-cache'
import { useEditProxy } from 'src/composables/state-proxy'
import { mutators } from 'app/src-shared/mutators'
import { t } from 'src/utils/i18n'
import AInput from 'src/components/AInput'
import { mutate } from 'src/utils/zero-session'
import { genId } from 'app/src-shared/utils/id'
import { computed, onUnmounted, toRef, useTemplateRef } from 'vue'
import { getExt, isTextFile, mimeTypeMatch, scaleWhenNeeded, shortcutKeyMatch, textBeginning, wrapCode } from 'src/utils/functions'
import { usePerfsStore } from 'src/stores/perfs'
import type { FullMessage } from 'app/src-shared/queries'
import MessageImage from './MessageImage.vue'
import MessageEntity from './MessageEntity.vue'
import ParseFilesDialog from './ParseFilesDialog.vue'
import { useQuasar } from 'quasar'
import type { ParseResult } from 'src/utils/file-parse'
import { parseText } from 'src/utils/file-parse'
import type { Plugins } from 'src/composables/plugins'
import PluginContextBtn from './PluginContextBtn.vue'
import { useListenKey } from 'src/composables/listen-key'

const props = defineProps<{
  message: FullMessage
  parentId: string
  inputTypes: string[]
  plugins?: Plugins
}>()

const emit = defineEmits<{
  send: []
}>()

const {
  value: editableMessage,
  update: updateEditableMessage,
} = useEditProxy(
  toRef(props, 'message'),
  ['id', 'text'],
  (id, updates) => {
    mutate(mutators.updateInputingMessage({
      id,
      ...updates,
    }))
  },
  { type: 'debounce', wait: 1000 },
)

const imageInput = useTemplateRef('imageInput')
const fileInput = useTemplateRef('fileInput')
function onInputFiles({ target }) {
  const files = target.files
  addFiles(Array.from(files))
  target.value = ''
}
function addItem(args: {
  name: string
  mimeType?: string
  text?: string
  language?: string
}) {
  const id = genId()
  const wait = mutate(mutators.createMessageItem({
    id,
    messageId: editableMessage.value.id,
    parentId: props.parentId,
    ...args,
  })).server
  return { id, wait }
}
async function addFiles(files: File[]) {
  const parseList: File[] = []
  for (let file of files) {
    if (await isTextFile(file)) {
      const text = await file.text()
      addItem({ name: file.name, text, language: getExt(file.name) })
    } else if (mimeTypeMatch(file.type, props.inputTypes)) {
      file = await scaleWhenNeeded(file)
      const { id, wait } = addItem({
        name: file.name,
        mimeType: file.type,
        ...await parseText(file),
      })
      upload(id, file, file.name, wait)
    } else {
      parseList.push(file)
    }
  }
  parseList.length && parseFiles(parseList)
}
const $q = useQuasar()
function parseFiles(files: File[]) {
  $q.dialog({
    component: ParseFilesDialog,
    componentProps: {
      files,
    },
  }).onOk((results: ParseResult[]) => {
    for (const { name, text, blob, language } of results) {
      const { id, wait } = addItem({ name, text, mimeType: blob?.type, language })
      blob && upload(id, blob, name, wait)
    }
  })
}

function onPaste(ev: ClipboardEvent) {
  const { clipboardData } = ev
  if (!clipboardData) return
  if (clipboardData.types.includes('text/plain')) {
    if (
      document.activeElement &&
      !['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName) &&
      !['true', 'plaintext-only'].includes((document.activeElement as HTMLElement).contentEditable)
    ) {
      const text = clipboardData.getData('text/plain')
      addItem({ name: t('Pasted text: {0}', textBeginning(text, 12)), text })
    }
    return
  }
  addFiles(Array.from(clipboardData.files))
}
addEventListener('paste', onPaste)
onUnmounted(() => removeEventListener('paste', onPaste))

const perfsStore = usePerfsStore()

const messageInput = useTemplateRef('messageInput')
function focusInput() {
  messageInput.value?.focus()
}
focusInput()
useListenKey(computed(() => perfsStore.perfs.focusInputKey), focusInput)

const empty = computed(() => !editableMessage.value.text && !editableMessage.value.entities.length)
function onEnter(ev: KeyboardEvent) {
  if (empty.value) return
  if (shortcutKeyMatch(perfsStore.perfs.sendMessageKey, ev)) {
    ev.preventDefault()
    emit('send')
  }
}

function onTextPaste(ev: ClipboardEvent) {
  if (!perfsStore.perfs.codePasteOptimize) return
  const { clipboardData } = ev
  if (!clipboardData) return
  const i = clipboardData.types.findIndex(t => t === 'vscode-editor-data')
  if (i !== -1) {
    const code = clipboardData.getData('text/plain')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    if (!/\n/.test(code)) return
    const data = clipboardData.getData('vscode-editor-data')
    const lang = JSON.parse(data).mode ?? ''
    if (lang === 'markdown') return
    const wrappedCode = wrapCode(code, lang)
    document.execCommand('insertText', false, wrappedCode)
    ev.preventDefault()
  }
}

function removeItem(id: string) {
  mutate(mutators.deleteMessageEntity({
    messageId: props.message.id,
    entityId: id,
  }))
}
</script>
