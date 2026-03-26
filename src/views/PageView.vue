<template>
  <div
    view-styles
    flex="~ col"
  >
    <common-toolbar>
      <div
        px-2
        min-w-0
        grow
      >
        <page-title-input
          :model-value="page.entity?.name ?? ''"
          @update:model-value="updateTitle"
          @keydown.enter="editor?.chain().focus().run()"
          :readonly="readonlyStateStore.readonly"
          w-full
        />
      </div>
      <q-btn
        icon="sym_o_chat_add_on"
        :title="t('Open AI Chat')"
        flat
        dense
        round
        @click="createChat"
        text-on-sur-var
      />
      <page-versions-btn
        :patches="page.patches"
        @restore="editor?.commands.setContent"
        flat
        dense
        round
        text-on-sur-var
      />
      <q-btn
        icon="sym_o_more_vert"
        text-on-sur-var
        flat
        dense
        round
      >
        <q-menu>
          <q-list>
            <menu-item
              icon="sym_o_upload_file"
              :label="t('Import')"
              @click="fileInput?.click()"
            />
            <q-item
              clickable
              min-h-0
            >
              <q-item-section
                avatar
                min-w-0
              >
                <q-icon
                  name="sym_o_file_export"
                  important:text="20px"
                />
              </q-item-section>
              <q-item-section>{{ t('Export') }}</q-item-section>
              <q-item-section side>
                <q-icon
                  name="sym_o_keyboard_arrow_right"
                  important:text="20px"
                />
              </q-item-section>
              <q-menu :offset="[0, 4]">
                <q-list>
                  <menu-item
                    :label="t('Copy Markdown')"
                    icon="sym_o_content_copy"
                    @click="copyMarkdown"
                  />
                  <menu-item
                    :label="t('Download Markdown')"
                    icon="sym_o_download"
                    @click="downloadMarkdown"
                  />
                  <menu-item
                    :label="t('Download Docx')"
                    icon="sym_o_download"
                    @click="exportDocx"
                  />
                </q-list>
              </q-menu>
            </q-item>
          </q-list>
        </q-menu>
        <input
          ref="fileInput"
          type="file"
          accept=".md,.docx,.xlsx"
          hidden
          @change="importFile"
        >
      </q-btn>
    </common-toolbar>
    <float-menu
      :editor
      :entity-id="page.id"
    />
    <editor-content
      :editor
      class="md-editor-preview vuepress-theme"
      p-0
      grow
      flex="~ col"
      of-y-auto
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { FullPage } from 'app/src-shared/queries'
import { base64ToUint8Array, uint8ArrayToBase64 } from 'app/src-shared/utils/functions'
import { useTemplateRef, watch, watchEffect } from 'vue'
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import { copyToClipboard, debounce, exportFile, Dialog, useQuasar } from 'quasar'
import { mutate } from 'src/utils/zero-session'
import Commands from 'src/components/tiptap-editor/slash-command/extension'
import { mutators } from 'app/src-shared/mutators'
import { genId, randomId } from 'app/src-shared/utils/id'
import { suggestion } from 'src/components/tiptap-editor/slash-command/suggestion'
import { entityRoute, getItemUrl, isTextFile, scaleWhenNeeded } from 'src/utils/functions'
import PageTitleInput from 'src/components/PageTitleInput.vue'
import { entityName } from 'src/utils/defaults'
import FloatMenu from 'src/components/tiptap-editor/FloatMenu.vue'
import FileHandler from '@tiptap/extension-file-handler'
import { upload } from 'src/utils/blob-cache'
import type { Editor } from '@tiptap/core'
import MenuItem from 'src/components/MenuItem.vue'
import { t } from 'src/utils/i18n'
import UniqueID from '@tiptap/extension-unique-id'
import { useRouter } from 'vue-router'
import { provideGlobal } from 'src/composables/provide-inject-global'
import { useReadonlyStateStore } from 'src/stores/readonly-state'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import { Math } from 'src/components/tiptap-editor/math/extension'
import type { Node } from '@tiptap/pm/model'
import EditLatexDialog from 'src/components/EditLatexDialog.vue'
import { staticExtensions } from 'src/components/tiptap-editor/static-extensions'
import { parseText } from 'src/utils/file-parse'
import PageVersionsBtn from 'src/components/PageVersionsBtn.vue'
import SelectEntityDialog from 'src/components/SelectEntityDialog.vue'

const props = defineProps<{
  page: FullPage
}>()

function updateTitle(title: string) {
  mutate(mutators.updateEntity({
    id: props.page.id,
    name: title,
  }))
}

const ydoc = new Y.Doc()
const patched = new Set<string>()
watch(() => props.page.patches, patches => {
  patches.filter(p => !patched.has(p.id)).forEach(p => {
    Y.applyUpdateV2(ydoc, base64ToUint8Array(p.patch))
    patched.add(p.id)
  })
}, { deep: 1, immediate: true })

function createPage() {
  const id = genId()
  mutate(mutators.createPage({
    id,
    name: '',
    parentId: props.page.id,
  }))
  return id
}

const editor = useEditor({
  extensions: [
    ...staticExtensions,
    Collaboration.configure({
      document: ydoc,
    }),
    Commands.configure({
      suggestion: suggestion([
        {
          title: 'Heading 1',
          icon: 'sym_o_format_h1',
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
          },
        },
        {
          title: 'Heading 2',
          icon: 'sym_o_format_h2',
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
          },
        },
        {
          title: 'Heading 3',
          icon: 'sym_o_format_h3',
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
          },
        },
        {
          title: 'Details',
          icon: 'sym_o_chevron_right',
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setDetails().run()
          },
        },
        {
          title: 'Page',
          icon: 'sym_o_note_stack_add',
          command: ({ editor, range }) => {
            const id = createPage()
            editor.chain().focus().deleteRange(range).insertContent({
              type: 'entityLink',
              attrs: {
                entityId: id,
                href: entityRoute('page', id),
              },
            }).run()
          },
        },
        {
          title: 'Link to',
          icon: 'sym_o_article_shortcut',
          command: ({ editor, range }) => {
            $q.dialog({
              component: SelectEntityDialog,
            }).onOk(entity => {
              editor.chain().focus().deleteRange(range).insertContent({
                type: 'entityLink',
                attrs: {
                  entityId: entity.id,
                  href: entityRoute(entity.type, entity.id),
                },
              }).run()
            })
          },
        },
      ]),
    }),
    FileHandler.configure({
      onPaste: (editor, files, content) => {
        if (content) return
        handleFiles(editor, files, editor.state.selection.anchor)
      },
      onDrop: handleFiles,
    }),
    UniqueID.configure({
      generateID: () => randomId(8),
      types: [
        'blockquote',
        'bulletList',
        'codeBlock',
        'heading',
        'horizontalRule',
        'listItem',
        'orderedList',
        'paragraph',
        'inlineMath',
        'blockMath',
        'table',
        'tableHeader',
        'tableRow',
        'image',
        'details',
        'detailsSummary',
        'detailsContent',
      ],
    }),
    Math.configure({
      onClick(node: Node, pos: number) {
        Dialog.create({
          component: EditLatexDialog,
          componentProps: {
            value: node.attrs.latex,
          },
        }).onOk(latex => {
          editor.value?.chain().setNodeSelection(pos).updateAttributes(node.type, { latex }).focus().run()
        })
      },
    }),
  ],
})
const readonlyStateStore = useReadonlyStateStore()
watchEffect(() => {
  editor.value?.setEditable(!readonlyStateStore.readonly)
})

provideGlobal('pageEditor', editor)

async function handleFiles(editor: Editor, files: File[], pos: number) {
  for (let file of files) {
    const id = genId()
    if (await isTextFile(file)) {
      const text = await file.text()
      mutate(mutators.createItem({
        id,
        parentId: props.page.id,
        name: file.name,
        text,
      }))
    } else {
      file = await scaleWhenNeeded(file)
      const wait = mutate(mutators.createItem({
        id,
        parentId: props.page.id,
        name: file.name,
        mimeType: file.type,
        ...await parseText(file),
      })).server
      upload(id, file, file.name, wait)
    }
    editor.chain().insertContentAt(
      pos,
      file.type.startsWith('image/')
        ? {
            type: 'image',
            attrs: {
              src: getItemUrl(id),
              alt: file.name,
              height: 400,
            },
          }
        : {
            type: 'entityLink',
            attrs: {
              entityId: id,
              href: entityRoute('item', id),
            },
          },
    ).focus().run()
  }
  return true
}

function copyMarkdown() {
  copyToClipboard(editor.value!.getMarkdown())
}
function downloadMarkdown() {
  exportFile(`${entityName(props.page.entity)}.md`, editor.value!.getMarkdown())
}
async function exportDocx() {
  const { exportDocx2 } = await import('src/utils/export-docx')
  exportFile(`${entityName(props.page.entity)}.docx`, await exportDocx2(editor.value!))
}

const updates: Uint8Array[] = []
const patch = debounce(() => {
  const { page } = props
  mutate(mutators.createPagePatch({
    id: genId(),
    entityId: page.id,
    patch: uint8ArrayToBase64(Y.mergeUpdatesV2(updates)),
  }))
  updates.splice(0)
}, 1000)
ydoc.on('updateV2', update => {
  updates.push(update)
  patch()
})

const router = useRouter()
function createChat() {
  const id = genId()
  mutate(mutators.createChat({
    ids: [id, genId()],
    parentId: props.page.id,
  }))
  router.push({ query: { rightEntity: JSON.stringify({ id, type: 'chat' }) } })
}

const fileInput = useTemplateRef('fileInput')
async function importFile({ target }) {
  const file = target.files[0]
  if (!file) return
  let text: string
  if (await isTextFile(file)) {
    text = await file.text()
  } else {
    const res = await parseText(file)
    if (!res?.text) return
    text = res.text
  }
  editor.value?.chain().focus().insertContent(text).run()
  if (!props.page.entity?.name) {
    updateTitle(file.name)
  }
}

const $q = useQuasar()
</script>

<style lang="scss">
.tiptap {
  --at-apply: 'grow px-5';
  --md-theme-code-inline-color: #d63200;
  --md-theme-code-inline-bg-color: #f8f8f8;
  --md-theme-code-block-color: #747384;
  --md-theme-code-block-bg-color: #f8f8f8;
  --md-theme-code-before-bg-color: var(--md-theme-code-block-bg-color);
  --md-theme-code-block-radius: 2px;

  [data-resize-handle] {
    width: 8px;
    cursor: ew-resize;
  }
  [data-resize-container].ProseMirror-selectednode img {
    --at-apply: 'outline outline-pri';
  }
  [data-type="inline-math"],
  [data-type="block-math"] {
    --at-apply: 'hover:bg-sur-c-high cursor-pointer transition-background-color duration-250 rd';
  }

  ul[data-type="taskList"] {
    --at-apply: 'list-none pl-0';

    li {
      --at-apply: 'flex items-center';

      label {
        --at-apply: 'flex items-center mr-2';
        input {
          --at-apply: 'size-16px';
        }
      }
      p {
        --at-apply: 'm-0';
      }
    }
  }

  [data-type="details"] {
    display: flex;
    gap: 0.25rem;

    summary {
      font-weight: 600;
    }

    > button {
      align-items: center;
      background: transparent;
      display: flex;
      font-size: 0.625rem;
      height: 1.25rem;
      justify-content: center;
      line-height: 1;
      margin-top: 0.1rem;
      padding: 0;
      width: 1.25rem;
      border-width: 0;
      cursor: pointer;

      &::before {
        content: '\25B6';
      }
    }

    &.is-open > button::before {
      transform: rotate(90deg);
    }
  }
}
</style>
