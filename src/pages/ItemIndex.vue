<template>
  <q-header bg-sur>
    <q-toolbar>
      <q-btn
        v-if="!uiStateStore.mainDrawerAbove"
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStateStore.toggleMainDrawer"
        text-on-sur-var
      />

      <q-btn
        v-if="!uiStateStore.rightDrawerAbove"
        flat
        dense
        round
        icon="sym_o_segment"
        @click="uiStateStore.toggleRightDrawer"
        text-on-sur-var
        ml-a
      />
    </q-toolbar>
  </q-header>
  <q-page-container>
    <q-page
      flex
      flex-col
      items-center
      justify-center
      @dragenter.prevent
      @dragover.prevent
      @drop.stop.prevent="onDrop"
    >
      <q-card
        flat
        bg-sur
        style="width: min(100%, 500px)"
      >
        <q-card-section
          py-0
          text-on-sur-var
        >
          <div class="text-h6">
            {{ t('Files') }}
          </div>
        </q-card-section>
        <q-card-section text-on-sur-var>
          <div>
            {{ t('Drag / paste /') }}
            <span
              pri-link
              @click="inputRef?.click()"
            >{{ t('click here') }}</span>
            {{ t('to upload files') }}
          </div>
          <input
            ref="inputRef"
            type="file"
            multiple
            @change="onInputFiles"
            hidden
          >
          <div mt-2>
            {{ t('Or, find existing files below:') }}
          </div>
        </q-card-section>
        <q-card-section p-2>
          <select-entity-panel
            default-type="item"
            @select="$router.push(entityRoute($event.type, $event.id))"
          />
        </q-card-section>
      </q-card>
      <div h="100px" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { useUiStateStore } from 'src/stores/ui-state'
import SelectEntityPanel from 'src/components/SelectEntityPanel.vue'
import { onUnmounted, useTemplateRef } from 'vue'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import { genId } from 'app/src-shared/utils/id'
import { parseText } from 'src/utils/file-parse'
import { useRightDirStore } from 'src/stores/right-dir'
import { upload } from 'src/utils/blob-cache'
import { useQuasar } from 'quasar'
import { entityRoute } from 'src/utils/functions'

const inputRef = useTemplateRef('inputRef')

const uiStateStore = useUiStateStore()

const rightDirStore = useRightDirStore()

const $q = useQuasar()
async function handleFiles(files: File[]) {
  if (!files.length) return
  for (const file of files) {
    const id = genId()
    const wait = mutate(mutators.createItem({
      id,
      parentId: rightDirStore.dirId!,
      name: file.name,
      mimeType: file.type,
      ...await parseText(file),
    })).server
    upload(id, file, file.name, wait)
  }
  $q.notify(t('Added {p0 file}; you can view the upload progress by clicking "Tasks" at the bottom right.', files.length))
}
function onInputFiles({ target }) {
  const files = target.files
  handleFiles(Array.from(files))
  target.value = ''
}

function onPaste(ev: ClipboardEvent) {
  const { clipboardData } = ev
  if (!clipboardData) return
  handleFiles(Array.from(clipboardData.files))
}
addEventListener('paste', onPaste)
onUnmounted(() => removeEventListener('paste', onPaste))

function onDrop({ dataTransfer }: DragEvent) {
  dataTransfer && handleFiles(Array.from(dataTransfer.files))
}
</script>
