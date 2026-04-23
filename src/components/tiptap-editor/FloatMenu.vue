<template>
  <bubble-menu
    v-if="editor"
    :editor
    :options="{ placement: 'top', offset: 8 }"
    :should-show
    z-5
  >
    <q-btn-group
      text-on-sur-var
      bg-sur-c
      unelevated
      shadow-default
    >
      <q-btn
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'route-active': editor.isActive('bold') }"
        icon="sym_o_format_bold"
        :title="t('Bold')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'route-active': editor.isActive('italic') }"
        icon="sym_o_format_italic"
        :title="t('Italic')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ 'route-active': editor.isActive('underline') }"
        icon="sym_o_format_underlined"
        :title="t('Underline')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'route-active': editor.isActive('strike') }"
        icon="sym_o_strikethrough_s"
        :title="t('Strike-through')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'route-active': editor.isActive('code') }"
        icon="sym_o_code"
        :title="t('Code')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        :class="{ 'route-active': editor.isActive('link') }"
        icon="sym_o_link"
        :title="t('Link')"
        un-size="32px"
        size="sm"
      >
        <q-menu
          :transition-duration="200"
          anchor="top middle"
          self="bottom middle"
          :offset="[0, 4]"
        >
          <link-menu-content
            :editor="editor"
            :model-value="editor.getAttributes('link').href"
            @update:model-value="setLink"
          />
        </q-menu>
      </q-btn>
      <q-btn
        @click="search"
        icon="sym_o_search"
        :title="t('Search')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="translate"
        icon="sym_o_translate"
        :title="t('Translate')"
        un-size="32px"
        size="sm"
      />
      <q-btn
        @click="copyMarkdown"
        :icon="copyMarkdownIcon"
        :title="t('Copy Markdown')"
        un-size="32px"
        size="sm"
      />
    </q-btn-group>
  </bubble-menu>
  <bubble-menu
    v-if="editor"
    :editor
    :options="{ placement: 'top', offset: 8 }"
    :should-show="linkSholdShow"
    z-5
  >
    <link-menu-content
      :editor="editor"
      :model-value="editor.getAttributes('link').href"
      @update:model-value="setLink"
      shadow-default
      bg-sur-c
      rd
    />
  </bubble-menu>
</template>

<script setup lang="ts">
import { isTextSelection, type Editor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { t } from 'src/utils/i18n'
import type { BubbleMenuPluginProps } from '@tiptap/extension-bubble-menu'
import LinkMenuContent from 'src/components/LinkMenuContent.vue'
import { copyToClipboard } from 'quasar'
import type { Node } from '@tiptap/pm/model'
import { ref } from 'vue'
import { createSearch } from 'src/services/create-search'
import { useRouter } from 'vue-router'
import { genId } from 'app/src-shared/utils/id'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'

const props = defineProps<{
  editor?: Editor
  entityId: string
}>()

const shouldShow: BubbleMenuPluginProps['shouldShow'] = ({ editor, element, view, state, from, to }) => {
  const { doc, selection } = state
  const { empty } = selection

  // Sometime check for `empty` is not enough.
  // Doubleclick an empty paragraph returns a node size of 2.
  // So we check also for an empty text size.
  const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(state.selection)

  // When clicking on a element inside the bubble menu the editor "blur" event
  // is called and the bubble menu item is focussed. In this case we should
  // consider the menu as part of the editor and keep showing the menu
  const isChildOfMenu = element.contains(document.activeElement)

  const hasEditorFocus = view.hasFocus() || isChildOfMenu

  if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) {
    return false
  }

  const types = ['codeBlock', 'image', 'inlineMath', 'blockMath', 'horizontalRule']
  if (types.some(type => editor.isActive(type))) return false

  return true
}
const linkSholdShow: BubbleMenuPluginProps['shouldShow'] = ({ editor, from, to }) => {
  return editor.isActive('link') && from === to
}

function setLink(link?: string) {
  if (!link) {
    props.editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  } else {
    props.editor?.chain().focus().extendMarkRange('link').setLink({ href: link }).run()
  }
}

function getMarkdown() {
  const editor = props.editor!
  const nodes: Node[] = []
  editor.state.selection.content().content.forEach(node => {
    nodes.push(node.toJSON())
  })
  const markdown = editor.markdown!.renderNodes(nodes, undefined, '\n')
  return markdown
}
function getText() {
  const { state } = props.editor!
  return state.doc.textBetween(state.selection.from, state.selection.to, '\n')
}

const copyMarkdownIcon = ref('sym_o_markdown_copy')
function copyMarkdown() {
  copyToClipboard(getMarkdown())
  copyMarkdownIcon.value = 'sym_o_check'
  setTimeout(() => {
    copyMarkdownIcon.value = 'sym_o_markdown_copy'
  }, 2000)
}

const router = useRouter()
async function search() {
  const text = getText()
  if (!text) return
  const id = await createSearch(text, props.entityId)
  router.push(`/search/${id}`)
}
async function translate() {
  const text = getMarkdown()
  if (!text) return
  const id = genId()
  await mutate(mutators.createTranslation({
    id,
    parentId: props.entityId,
    input: text,
  })).client
  router.push({
    query: { rightEntity: JSON.stringify({ type: 'translation', id }) },
    hash: '#translate',
  })
}
</script>
