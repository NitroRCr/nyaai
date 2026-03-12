<template>
  <div
    flex
    :class="{ 'flex-row-reverse': align === 'right' }"
    gap-4
  >
    <div v-if="avatar && !(align === 'left' && dense)">
      <a-avatar
        :avatar
        pos-sticky
        mt-1
        top-1
        size="32px"
        :class="{ 'mx--1': dense }"
      />
    </div>
    <div
      flex="~ col"
      min-w-0
    >
      <div
        v-if="childNum > 1 || !inputing"
        flex
        items-center
        pos-sticky
        top-0
        z-11
        h="40px"
        bg-sur
        :class="{ 'flex-row-reverse': align === 'right' }"
      >
        <a-avatar
          v-if="avatar && (align === 'left' && dense)"
          :avatar
          size="32px"
          mr-3
        />
        <div
          v-if="name"
          text="on-sur-var ellipsis"
          of-hidden
          whitespace-nowrap
        >
          {{ name }}
        </div>
        <q-space w-2 />
        <div
          text-sec
          flex
          items-center
        >
          <template v-if="childNum > 1">
            <q-pagination
              v-model="model"
              :max="childNum"
              input
              :boundary-links="false"
            />
            <q-btn
              icon="sym_o_delete"
              v-if="!generating"
              flat
              round
              size="sm"
              text="hover:err"
              :title="t('Delete Branch')"
              @click="deleteBranch"
            />
          </template>
          <template v-if="!inputing">
            <copy-btn
              round
              flat
              size="sm"
              :value="message.text"
            />
            <q-btn
              v-if="actions.regenerate"
              icon="sym_o_refresh"
              round
              flat
              size="sm"
              :title="t('Regenerate')"
              @click="$emit('regenerate')"
            />
            <q-btn
              v-if="actions.edit"
              icon="sym_o_edit"
              round
              flat
              size="sm"
              :title="t('Edit')"
              @click="$emit('edit')"
            />
            <q-btn
              v-if="dense && scrollContainer && headList.length > 0"
              icon="sym_o_format_list_bulleted"
              round
              flat
              size="sm"
              :title="t('Toc')"
            >
              <q-menu p-2>
                <md-catalog
                  :scroll-element="scrollContainer"
                  v-bind="mdCatalogProps"
                  :scroll-element-offset-top="48"
                />
              </q-menu>
            </q-btn>
            <q-btn
              icon="sym_o_more_vert"
              round
              flat
              size="sm"
              :title="t('More Actions')"
            >
              <q-menu>
                <q-list>
                  <menu-item
                    icon="sym_o_code"
                    :label="t('Source Code')"
                    @click="sourceCodeMode = !sourceCodeMode"
                    :active="sourceCodeMode"
                  />
                  <menu-item
                    v-if="actions.directEdit"
                    icon="sym_o_edit"
                    :label="t('Direct Edit')"
                    @click="directEdit"
                  />
                  <menu-item
                    icon="sym_o_format_quote"
                    :label="t('Quote')"
                    @click="$emit('quote', message.text)"
                  />
                  <menu-item
                    icon="sym_o_info"
                    :label="t('More Info')"
                    @click="moreInfo"
                  />
                  <menu-item
                    v-if="actions.directDelete"
                    icon="sym_o_delete"
                    :label="t('Delete')"
                    @click="directDelete"
                    hover:text-err
                  />
                </q-list>
              </q-menu>
            </q-btn>
          </template>
        </div>
      </div>
      <div
        class="group"
        pos-relative
        :class="{ 'message-sticky-offset': childNum > 1 || !inputing }"
      >
        <q-expansion-item
          v-if="message.reasoning"
          icon="sym_o_auto_awesome"
          :label="t('Reasoning Content')"
          :default-opened="generating && perfsStore.perfs.expandReasoningContent"
          bg-sur-c-low
          of-hidden
          rd-md
          my-2
          header-class="min-h-40px reasoning-content-header"
        >
          <q-card important:bg-sur-c-low>
            <q-card-section
              text="on-sur-var"
              font-code
              whitespace-pre-wrap
              pt-2
              @vue:updated="onHtmlChanged"
            >
              {{ message.reasoning.trim() }}
            </q-card-section>
          </q-card>
        </q-expansion-item>
        <div
          ref="textDiv"
          @mouseup="onSelect('mouse')"
          @touchend="onSelect('touch')"
          pos-relative
          overflow-visible
        >
          <md-preview
            :class="background ? 'bg-sur-c-low px-4' : 'bg-sur'"
            rd-lg
            :model-value="message.text"
            v-bind="mdPreviewProps"
            @on-html-changed="onHtmlChanged"
            @on-get-catalog="headList = $event"
          />
          <transition name="fade">
            <q-btn-group
              v-if="selected.text"
              :style="floatBtnStyle"
              pos-absolute
              z-20
              bg-sec-c
              text-on-sec-c
              shadow-default
              class="float-btn-group"
              :class="{ dense: $q.screen.lt.md }"
            >
              <q-btn
                icon="sym_o_format_quote"
                :label="t('Quote')"
                @click="$emit('quote', selected.text)"
                no-caps
              />

              <template v-if="!selected.text.includes('\n')">
                <q-separator vertical />
                <q-btn
                  v-if="!selected.text.includes('\n')"
                  icon="sym_o_search"
                  :label="t('Search')"
                  @click="search(selected.text)"
                  no-caps
                />
              </template>
              <q-separator vertical />
              <q-btn
                icon="sym_o_translate"
                :label="t('Translate')"
                @click="translate(selected.text)"
                no-caps
              />
              <template v-if="selected.markdown">
                <q-separator vertical />
                <q-btn
                  icon="sym_o_content_copy"
                  label="Markdown"
                  @click="copyToClipboard(selected.markdown)"
                  :title="t('Copy Markdown')"
                  no-caps
                />
              </template>
            </q-btn-group>
          </transition>
        </div>
        <div
          v-if="message.entities.length"
          flex="~ wrap"
          gap-2
        >
          <message-image
            v-for="entity of message.entities.filter(i => i.item?.mimeType?.startsWith('image/'))"
            :key="entity.id"
            :entity
            h="100px"
          />
          <message-entity
            v-for="entity of message.entities.filter(i => !i.item?.mimeType?.startsWith('image/'))"
            :key="entity.id"
            :entity
          />
        </div>
        <toolcall-item
          v-for="toolCall of message.toolCalls"
          :key="toolCall.id"
          :tool-call
          my-2
        />
        <div
          text-err
          break-word
          my-2
          v-if="message.error"
        >
          {{ message.error }}
        </div>
        <div
          text-warn
          my-2
          v-for="(warning, index) in message.warnings"
          :key="index"
        >
          {{ warning }}
        </div>
        <div
          text="out xs"
          pos-absolute
          left-0
          right-0
          bottom--1
          translate-y="100%"
          opacity-0
          group-hover:opacity-100
          transition="opacity 250"
          whitespace-nowrap
          flex
          gap-2
        >
          <span>{{ message.modelName }}</span>
          <span ml-a>{{ timeText(message) }}</span>
        </div>
        <q-linear-progress
          v-if="generating"
          indeterminate
          mt-2
        />
      </div>
    </div>
    <div
      v-if="!dense && scrollContainer"
      max-w="22.5%"
    >
      <md-catalog
        pos-sticky
        top-2
        mt-2
        text-on-sur-var
        v-bind="mdCatalogProps"
        :scroll-element="scrollContainer"
        :scroll-element-offset-top="48"
      />
    </div>
    <div>
      <teleport
        v-for="({ id, component, props: p }) in dynamicComponents"
        :key="id"
        :to="`#${id}`"
      >
        <component
          :is="component"
          v-bind="p"
        />
      </teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Avatar } from 'app/src-shared/utils/validators'
import AAvatar from './AAvatar.vue'
import { t } from 'src/utils/i18n'
import type { Component } from 'vue'
import { computed, nextTick, onUnmounted, reactive, ref, shallowReactive, useTemplateRef } from 'vue'
import type { HeadList } from 'md-editor-v3'
import { MdCatalog, MdPreview } from 'md-editor-v3'
import { useMdProps } from 'src/composables/md-props'
import { copyToClipboard, useQuasar } from 'quasar'
import TextareaDialog from './TextareaDialog.vue'
import { dialogOptions } from 'src/utils/props'
import { mutate, user } from 'src/utils/zero-session'
import MessageInfoDialog from './MessageInfoDialog.vue'
import CopyBtn from './CopyBtn.vue'
import MenuItem from './MenuItem.vue'
import type { FullMessage } from 'app/src-shared/queries'
import { entityAvatar, entityName, userAvatar } from 'src/utils/defaults'
import { allowDeleteMessage, allowEditMessageText, mutators } from 'app/src-shared/mutators'
import { tasks } from 'src/utils/tasks'
import { mdExtensions } from 'src/utils/md-extensions'
import { genId } from 'app/src-shared/utils/id'
import MessageImage from './MessageImage.vue'
import MessageEntity from './MessageEntity.vue'
import { usePerfsStore } from 'src/stores/perfs'
import ToolcallItem from './ToolCallItem.vue'
import { createSearch } from 'src/services/create-search'
import { useRouter } from 'vue-router'

const props = defineProps<{
  message: FullMessage
  childNum: number
  scrollContainer?: HTMLElement | null
  dense?: boolean
  inputing?: boolean
}>()

const model = defineModel<number>({ required: true })

const emit = defineEmits<{
  regenerate: []
  edit: []
  rendered: []
  deleteBranch: []
  quote: [string]
}>()

const generating = computed(() => tasks.some(t => t.id === props.message.id && t.status === 'running'))

const align = computed(() => {
  const { type, userId } = props.message
  if (type.endsWith(':assistant')) return 'left'
  if (type === 'chat:user') return 'right'
  return userId === user.id ? 'right' : 'left'
})
const background = computed(() => props.message.type !== 'chat:assistant')
const avatar = computed<Avatar | undefined>(() =>
  props.message.type.endsWith(':assistant')
    ? props.message.assistant && entityAvatar(props.message.assistant.entity)
    : props.message.user && userAvatar(props.message.user),
)
const name = computed(() =>
  props.message.type.endsWith(':assistant')
    ? props.message.assistant && entityName(props.message.assistant.entity)
    : props.message.user && props.message.user.id !== user.id && props.message.user.name,
)
const actions = computed(() => ({
  regenerate: props.message.type.endsWith(':assistant'),
  edit: props.message.type === 'chat:user',
  directEdit: allowEditMessageText(props.message, user.id!),
  directDelete: allowDeleteMessage(props.message, user.id!),
}))

function onHtmlChanged() {
  nextTick(() => {
    emit('rendered')
  })
  handleHtmlChanged()
}

const { mdPreviewProps, mdCatalogProps } = useMdProps()

const sourceCodeMode = ref(false)

const headList = ref<HeadList[]>([])

const $q = useQuasar()
function directEdit() {
  $q.dialog({
    component: TextareaDialog,
    componentProps: {
      title: t('Edit Message'),
      model: props.message.text,
    },
  }).onOk(text => {
    mutate(mutators.editMessageText({
      id: props.message.id,
      text,
    }))
  })
}
function deleteBranch() {
  if (props.inputing || props.message.error) {
    emit('deleteBranch')
    return
  }
  $q.dialog({
    title: t('Delete Branch'),
    message: t('Are you sure you want to delete this message branch? This message and all subsequent messages will be deleted.'),
    cancel: true,
    ok: {
      label: t('Delete'),
      color: 'err',
      flat: true,
    },
    ...dialogOptions,
  }).onOk(() => {
    emit('deleteBranch')
  })
}
function directDelete() {
  $q.dialog({
    title: t('Delete Message'),
    message: t('Are you sure you want to delete this message?'),
    cancel: true,
    ok: {
      label: t('Delete'),
      color: 'err',
      flat: true,
    },
    ...dialogOptions,
  }).onOk(() => {
    mutate(mutators.deleteMessage(props.message.id))
  })
}
function moreInfo() {
  $q.dialog({
    component: MessageInfoDialog,
    componentProps: { message: props.message },
  })
}

const dynamicComponents = shallowReactive<{
  id: string
  component: Component
  props: object
}[]>([])
const handleHtmlChanged = () => {
  nextTick(() => {
    const container = document.getElementById(mdPreviewProps.value.id)
    if (!container) return
    for (const i of dynamicComponents) {
      if (!document.getElementById(i.id)) dynamicComponents.splice(dynamicComponents.indexOf(i), 1)
    }
    for (const extension of mdExtensions) {
      const markers = container.querySelectorAll<HTMLAnchorElement>(extension.selector)
      for (const el of markers) {
        const id = `dc-${genId()}`
        const wrapper = document.createElement(extension.wrapper)
        wrapper.id = id
        el.replaceWith(wrapper)
        dynamicComponents.push({
          id,
          component: extension.component,
          props: extension.parseProps(el),
        })
      }
    }
  })
}

const perfsStore = usePerfsStore()

function timeText(message: FullMessage) {
  if (message.editedAt) return t('Edited at {0}', new Date(message.editedAt).toLocaleString())
  if (message.sentAt) return new Date(message.sentAt).toLocaleString()
  return null
}

const floatBtnStyle = reactive({
  top: undefined as string | undefined,
  left: undefined as string | undefined,
})
const textDiv = useTemplateRef('textDiv')
const selected = reactive({
  text: null as string | null,
  markdown: null as string | null,
})
function getDataLine(node: Node | null, ttl = 5) {
  if (!node || ttl === 0) return -1
  if (node.nodeType !== Node.ELEMENT_NODE) return getDataLine(node.parentElement, ttl - 1)
  const val = (node as Element).getAttribute('data-line')
  return val ? parseInt(val) : getDataLine(node.parentElement, ttl - 1)
}
function onSelect(mode: 'mouse' | 'touch') {
  const { perfs } = perfsStore
  if (!perfs.messageSelectionBtn) return
  const selection = document.getSelection()
  if (!selection) return
  const text = selection.toString()
  if (!text) return
  const start = getDataLine(selection.anchorNode)
  const end = getDataLine(selection.focusNode)
  if (start === -1 || end === -1) {
    selected.text = text
  } else {
    selected.markdown = props.message.text.split('\n').slice(start, end + 1).join('\n')
    selected.text = start === end ? text : selected.markdown
  }
  const range = selection.getRangeAt(0)
  const targetRects = range.getBoundingClientRect()
  const baseRects = textDiv.value!.getBoundingClientRect()
  floatBtnStyle.top = targetRects.top < 48 || mode === 'touch'
    ? targetRects.bottom - baseRects.top + 12 + 'px'
    : targetRects.top - baseRects.top - 48 + 'px'
  floatBtnStyle.left = Math.min(
    targetRects.left - baseRects.left,
    Math.max(baseRects.width - 375, 0),
  ) + 'px'
}
if (perfsStore.perfs.messageSelectionBtn) {
  const listener = () => {
    selected.text = null
    selected.markdown = null
  }
  document.addEventListener('selectionchange', listener)
  onUnmounted(() => document.removeEventListener('selectionchange', listener))
}

const router = useRouter()
async function search(text: string) {
  const id = await createSearch(text, props.message.entityId)
  router.push(`/search/${id}`)
}
async function translate(text: string) {
  const id = genId()
  await mutate(mutators.createTranslation({
    id,
    parentId: props.message.entityId,
    input: text,
  })).client
  router.push({
    query: { rightEntity: JSON.stringify({ type: 'translation', id }) },
    hash: '#translate',
  })
}
</script>
<style lang="scss">
.reasoning-content-header {
  .q-item__section--avatar {
    min-width: 0;
  }
}

.message-sticky-offset {
  .md-editor-code .md-editor-code-head {
    top: 40px;
    z-index: 10;
  }
}

.float-btn-group {
  .q-btn {
    .q-icon {
      font-size: 18px;
      margin-right: 8px;
    }
    padding: 4px 12px;
  }

  &.dense {
    .q-btn {
      .q-icon {
        font-size: 16px;
        margin-right: 4px;
      }
      padding: 4px 8px;
    }
  }
}
</style>
