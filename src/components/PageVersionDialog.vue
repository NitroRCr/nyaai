<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card
      w-90vw
      important:max-w-800px
      bg-sur
      flex="~ col"
    >
      <q-card-section>
        <div class="text-h6">
          {{ idDateString(patches.at(-1)!.id) }}
        </div>
      </q-card-section>
      <q-card-section
        p-0
        of-y-auto
      >
        <editor-content
          :editor
          class="md-editor-preview vuepress-theme"
          p-0
          grow
          flex="~ col"
          of-y-auto
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="t('Cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="t('Restore')"
          @click="onDialogOK(editor!.getJSON())"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { t } from 'src/utils/i18n'
import * as Y from 'yjs'
import type { FullPage } from 'app/src-shared/queries'
import { Math } from './tiptap-editor/math/extension'
import { staticExtensions } from './tiptap-editor/static-extensions'
import Collaboration from '@tiptap/extension-collaboration'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { base64ToUint8Array } from 'app/src-shared/utils/functions'
import { idDateString } from 'app/src-shared/utils/id'

const props = defineProps<{
  patches: FullPage['patches']
}>()

defineEmits([
  ...useDialogPluginComponent.emits,
])

const ydoc = new Y.Doc()

props.patches.forEach(patch => {
  Y.applyUpdateV2(ydoc, base64ToUint8Array(patch.patch))
})

const editor = useEditor({
  extensions: [
    ...staticExtensions,
    Collaboration.configure({
      document: ydoc,
    }),
    Math,
  ],
  editable: false,
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
