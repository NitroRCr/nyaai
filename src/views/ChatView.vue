<template>
  <div
    flex="~ col"
    view-styles
  >
    <common-toolbar>
      <assistant-model-select
        v-if="$route.params.type === 'chat' && workspaceStore.id"
        :assistant-id="conf.chatAssistantId"
        :model-id="chat.modelId"
        :workspace-id="workspaceStore.id"
        :conf
        @update:assistant-id="switchAssistant"
        @update:model-id="switchModel"
      />
      <q-toolbar-title
        v-else
        text-lg
      >
        {{ entityName(entity) }}
      </q-toolbar-title>
      <div ml-a />
    </common-toolbar>
    <div
      grow
      bg-sur
      of-y-auto
      ref="scrollContainer"
      pos-relative
      @scroll="onScroll"
    >
      <template
        v-for="[parent, current] of pairs(chain)"
        :key="current"
      >
        <message-item
          class="message-item"
          :data-message-id="current"
          v-if="messageMap[current]"
          :model-value="chat.msgRoute[parent] + 1"
          :message="messageMap[current]"
          :child-num="chat.msgTree[parent].length"
          :scroll-container
          @update:model-value="switchChain(parent, $event - 1)"
          @edit="edit(parent)"
          @regenerate="regenerate(parent)"
          @delete-branch="deleteBranch(parent)"
          @rendered="streamingTask && lockBottom()"
          @quote="quote"
          :inputing="current === chain.at(-1)"
          :dense="position !== 'full' || $q.screen.lt.md"
          p-4
        />
      </template>
    </div>
    <div
      pos-relative
      v-if="perfsStore.perfs.chatScrollBtns"
    >
      <div
        pos-absolute
        top--1
        right-1
        flex="~ col"
        text-sec
        translate-y="-100%"
        z-1
      >
        <q-btn
          flat
          round
          dense
          icon="sym_o_first_page"
          rotate-90
          @click="scroll('top')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_keyboard_arrow_up"
          @click="scroll('up')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_keyboard_arrow_down"
          @click="scroll('down')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_last_page"
          rotate-90
          @click="scroll('bottom')"
        />
      </div>
      <message-input
        :message="getMessageAt(-1)!"
        :parent-id="chat.id"
        :input-types="modelInputTypes(model).user"
        :plugins
        @send="send"
        v-slot="{ empty }"
      >
        <provider-options-btn
          v-if="model"
          :model
          v-model:options="providerOptions"
          v-model:tools="providerTools"
          flat
          round
        />
        <q-btn
          v-if="$route.params.type === 'chat'"
          flat
          :round="!activePluginCount"
          :class="{ 'px-2': activePluginCount }"
          min-w="2.7em"
          min-h="2.7em"
          icon="sym_o_extension"
          :title="t('Plugins')"
        >
          <code
            v-if="activePluginCount"
            bg-sur-c-high
            px="6px"
          >{{ activePluginCount }}</code>
          <q-menu>
            <q-list>
              <plugin-toggle-items
                :model-value="pluginIds"
                @update:model-value="updatePlugins"
                :status="Object.fromEntries(Object.entries(plugins).map(([id, { status }]) => [id, status]))"
              />
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          icon="sym_o_add"
          :title="t('Add Item')"
          flat
          round
          @click="selectEntity"
        />
        <q-space />
        <div
          v-if="usage"
          my-2
          mx-2
        >
          <q-icon
            name="sym_o_generating_tokens"
            size="24px"
          />
          <code
            v-if="$q.screen.gt.xs"
            bg-sur-c-high
            px-2
            py-1
          >{{ usage.inputTokens }}+{{ usage.outputTokens }}</code>
          <q-tooltip>
            {{ t('Last Message Token Consumption') }}<br>
            {{ t('Input') }}: {{ usage.inputTokens }}, {{ t('Output') }}: {{ usage.outputTokens }}
          </q-tooltip>
        </div>
        <abortable-btn
          :loading="!!streamingTask"
          :disable="empty && !streamingTask"
          @click="send"
          @abort="abort"
          :label="t('Send')"
          icon="sym_o_send"
        />
      </message-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStateStore } from 'src/stores/ui-state'
import type { Ref } from 'vue'
import { computed, inject, nextTick, toRef, useTemplateRef, watch, ref } from 'vue'
import { mutate, z } from 'src/utils/zero-session'
import { genId } from 'app/src-shared/utils/id'
import { getCommonVars, pairs } from 'src/utils/functions'
import { t } from 'src/utils/i18n'
import { useChatRes } from 'src/composables/chat-res'
import { useQuasar } from 'quasar'
import type { FullChat, FullModel } from 'app/src-shared/queries'
import { tasks } from 'src/utils/tasks'
import AbortableBtn from 'src/components/AbortableBtn.vue'
import { mutators } from 'app/src-shared/mutators'
import AssistantModelSelect from 'src/components/AssistantModelSelect.vue'
import { queries } from 'app/src-shared/queries'
import { useThisEntityConf } from 'src/composables/entity-conf'
import { useQuery } from 'src/composables/zero/query'
import type { CompletionConfig } from 'src/services/stream-message'
import { streamChat } from 'src/services/stream-message'
import { generateChatTitle } from 'src/services/generate-chat-title'
import Mark from 'mark.js'
import type { LayoutPosition } from 'src/utils/types'
import { useRoute } from 'vue-router'
import { entityName, modelInputTypes, modelName } from 'src/utils/defaults'
import { usePlugins } from 'src/composables/plugins'
import PluginToggleItems from 'src/components/PluginToggleItems.vue'
import { editPageSdkTool } from 'src/utils/edit-page'
import { injectGlobal } from 'src/composables/provide-inject-global'
import type { Editor } from '@tiptap/vue-3'
import SelectEntityDialog from 'src/components/SelectEntityDialog.vue'
import { useWorkspaceStore } from 'src/stores/workspace'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import MessageInput from 'src/components/MessageInput.vue'
import { usePerfsStore } from 'src/stores/perfs'
import { useChatScroll } from 'src/composables/chat-scroll'
import MessageItem from 'src/components/MessageItem.vue'
import { flush } from 'src/composables/state-proxy'
import ProviderOptionsBtn from 'src/components/ProviderOptionsBtn.vue'
import { DefaultPromptTemplate } from 'src/utils/templates'
import { useQuote } from 'src/composables/quote'
import { useListenKey } from 'src/composables/listen-key'
import { engine } from 'src/utils/template-engine'
import { localData } from 'src/utils/local-data'

const props = defineProps<{
  chat: FullChat
}>()

const position = inject<Ref<LayoutPosition>>('position')!

const { entity, conf } = useThisEntityConf()
const { data: assistant } = useQuery(() => conf.value.chatAssistantId ? queries.fullAssistant(conf.value.chatAssistantId) : null)
const modelId = computed(() => props.chat.modelId ?? assistant.value?.modelId ?? conf.value.chatModelId)
const { data: model } = useQuery(() => modelId.value ? queries.fullModel(modelId.value) : null)

const pluginIds = computed(() => props.chat.plugins ?? assistant.value?.plugins ?? [])
const { plugins, pluginsPrompt } = usePlugins(pluginIds)
const activePluginCount = computed(() => Object.values(plugins.value).filter(({ status }) => status === 'ready').length)

function updatePlugins(plugins: string[]) {
  mutate(mutators.updateChat({
    id: props.chat.id,
    plugins,
  }))
}

const { getMessageAt, chain, messageMap } = useChatRes(toRef(props, 'chat'))

function switchChain(target: string, value: number) {
  mutate(mutators.switchChain({ entityId: props.chat.id, updates: { [target]: value } }))
}

async function edit(parent: string) {
  const { msgTree, msgRoute } = props.chat
  const { type, text, entities } = messageMap.value[msgTree[parent][msgRoute[parent]]]
  const id = genId()
  await mutate(mutators.appendMessage({
    entityId: props.chat.id,
    target: parent,
    props: { id, type: type as 'chat:user' | 'chat:assistant', text },
    entities: entities.map(entity => entity.id),
  })).client
}

const $q = useQuasar()
async function regenerate(parent: string) {
  const params = await getStreamParams()
  if (!params) return
  await mutate(mutators.appendMessagePair({
    entityId: props.chat.id,
    target: parent,
    aProps: { id: genId(), assistantId: assistant.value!.id, modelName: modelName(model.value), sentAt: Date.now() },
    uProps: { id: genId() },
  })).client
  stream(params)
}

async function deleteBranch(parent: string) {
  const branch = props.chat.msgRoute[parent]
  await mutate(mutators.deleteBranch({
    entityId: props.chat.id,
    parent,
    branch,
  })).client
}

const { chatScrollTops } = useUiStateStore()
function onScroll(ev: Event) {
  const container = ev.target as HTMLElement
  chatScrollTops.set(props.chat.id, container.scrollTop)
}
const scrollContainer = useTemplateRef('scrollContainer')
watch(() => props.chat.id, id => {
  nextTick(() => {
    scrollContainer.value?.scrollTo({ top: chatScrollTops.get(id) ?? 0 })
  })
})

function selectEntity() {
  $q.dialog({
    component: SelectEntityDialog,
  }).onOk(entity => {
    mutate(mutators.createMessageEntities({
      messageId: chain.value.at(-1)!,
      entityIds: [entity.id],
    }))
  })
}

const route = useRoute()

watch(route, async () => {
  const messageId = route.query.messageId
  const highlight = route.query.highlight

  if (typeof messageId !== 'string') return

  const { msgTree } = props.chat
  const parentMap = Object.entries(msgTree).reduce((acc, [parent, children]) => {
    children.forEach(child => { acc[child] = parent })
    return acc
  }, {} as Record<string, string>)

  if (!parentMap[messageId]) return

  const updates: Record<string, number> = {}
  let curr = messageId
  while (curr !== '$root') {
    const parent = parentMap[curr]
    updates[parent] = msgTree[parent].indexOf(curr)
    curr = parent
  }
  await mutate(mutators.switchChain({ entityId: props.chat.id, updates })).client
  await nextTick()

  const el = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!el) return

  const instance = new Mark(el)
  instance.unmark()
  highlight && instance.mark(highlight)

  document.querySelector('mark')?.scrollIntoView({ block: 'center' })
}, { immediate: true })

async function getStreamParams() {
  const config = await getCompletionConfig()
  if (!config) {
    $q.notify({ message: t('Please select an assistant'), color: 'negative' })
    return null
  }
  if (!model.value) {
    $q.notify({ message: t('Please select a model'), color: 'negative' })
    return null
  }
  return {
    model: model.value,
    config,
  }
}

async function send() {
  const params = await getStreamParams()
  if (!params) return
  const { id } = props.chat
  const target = chain.value.at(-1)!
  flush(target)
  await mutate(mutators.appendMessagePair({
    entityId: id,
    target,
    aProps: { id: genId(), assistantId: assistant.value?.id, modelName: modelName(model.value), sentAt: Date.now() },
    uProps: { id: genId() },
  })).client
  nextTick(() => {
    scroll('bottom')
  })
  const { promise } = stream(params)
  if (chain.value.length === 4 && perfsStore.perfs.autoGenChatTitle) {
    promise.then(generateTitle)
  }
}
async function generateTitle() {
  await generateChatTitle({ chat: props.chat, conf: conf.value }).catch(err => {
    console.error(err)
    $q.notify({
      message: t('Failed to generate chat title: {0}', err.message),
      color: 'negative',
    })
  })
}

const streamingTask = computed(() => tasks.find(t => t.id === chain.value.at(-2)! && t.status === 'running'))

const lockingBottom = ref(false)
const perfsStore = usePerfsStore()
function lockBottom() {
  lockingBottom.value && scroll('bottom', 'auto')
}
let lastScrollTop: number | null
function scrollListener() {
  const container = scrollContainer.value!
  if (container.scrollTop < lastScrollTop!) {
    lockingBottom.value = false
  }
  lastScrollTop = container.scrollTop
}
watch(lockingBottom, val => {
  if (!scrollContainer.value) return
  if (val) {
    lastScrollTop = scrollContainer.value.scrollTop
    scrollContainer.value.addEventListener('scroll', scrollListener)
  } else {
    lastScrollTop = null
    scrollContainer.value.removeEventListener('scroll', scrollListener)
  }
})
function stream(params: {
  model: FullModel
  config: CompletionConfig
}) {
  lockingBottom.value = perfsStore.perfs.streamingLockBottom
  const task = streamChat({
    id: chain.value.at(-2)!,
    title: t('Chat Completion: {0}', entityName(entity.value)),
    link: `/chat/${props.chat.id}`,
  }, {
    chat: props.chat,
    ...params,
  })
  task.promise.finally(() => {
    lockingBottom.value = false
  })
  return task
}
watch(() => props.chat.id, async () => {
  if (route.params.type === 'search' && !streamingTask.value && !messageMap.value[chain.value.at(-2)!].text) {
    const params = await getStreamParams()
    params && stream(params)
  }
}, { immediate: true })

async function getCompletionConfig(): Promise<CompletionConfig | undefined> {
  if (route.params.type === 'chat') {
    if (assistant.value) {
      const { promptTemplate, promptRole, contextNum, streamSettings, prompt } = assistant.value
      return {
        promptTemplate: promptTemplate || DefaultPromptTemplate,
        promptRole,
        contextNum,
        streamSettings,
        vars: {
          _rolePrompt: prompt,
          _pluginsPrompt: engine.parseAndRenderSync(pluginsPrompt.value, getCommonVars()),
        },
        tools: Object.fromEntries(Object.entries(plugins.value).map(([id, { tools }]) => [id, tools])),
        sdkTools: providerTools.value,
        providerOptions: providerOptions.value,
      }
    }
  }
  const base = {
    promptRole: 'system',
    streamSettings: {},
  } satisfies Partial<CompletionConfig>
  if (route.params.type === 'search') {
    const record = await z.run(queries.searchRecord(props.chat.id), { type: 'complete' })
    if (record) {
      return {
        ...base,
        promptTemplate: conf.value.searchAssistantPrompt,
        promptRole: 'user',
        vars: {
          query: record.q,
          results: record.results,
          language: localData.locale ?? navigator.language,
        },
        tools: {},
      }
    }
  } else if (route.params.type === 'page') {
    const entity = await z.run(queries.entity({ id: route.params.id as string }), { type: 'complete' })
    const editor = injectGlobal<Ref<Editor>>('pageEditor')
    if (editor?.value) {
      return {
        ...base,
        promptTemplate: conf.value.pageAssistantPrompt,
        vars: {
          title: entityName(entity),
          content: editor.value.getHTML(),
        },
        tools: {},
        sdkTools: {
          edit_page: editPageSdkTool,
        },
      }
    }
  }
}

function abort() {
  streamingTask.value?.abort()
}

function switchAssistant(id: string | null) {
  mutate(mutators.updateEntityConf({
    id: props.chat.id,
    updates: { chatAssistantId: id },
  }))
}
function switchModel(id: string | null) {
  mutate(mutators.updateChat({
    id: props.chat.id,
    modelId: id,
  }))
}

const workspaceStore = useWorkspaceStore()

const usage = computed(() => getMessageAt(-2)?.usage)

const { getEls, itemInView, scroll } = useChatScroll(scrollContainer)

function regenerateCurr() {
  const { container, items } = getEls()
  const index = items.findIndex(
    (item, i) => itemInView(item, container) && getMessageAt(i + 1)?.type === 'chat:assistant',
  )
  if (index === -1) return
  regenerate(chain.value[index])
}
function editCurr() {
  const { container, items } = getEls()
  const index = items.findIndex(
    (item, i) => itemInView(item, container) && getMessageAt(i + 1)?.type === 'chat:user',
  )
  if (index === -1) return
  edit(chain.value[index])
}

const providerOptions = ref({})
const providerTools = ref({})

const quote = useQuote(computed(() => getMessageAt(-1)!))

useListenKey(computed(() => perfsStore.perfs.regenerateCurrKey), regenerateCurr)
useListenKey(computed(() => perfsStore.perfs.editCurrKey), editCurr)
</script>
