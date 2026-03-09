<template>
  <div
    flex="~ col"
    view-styles
  >
    <common-toolbar>
      <q-toolbar-title text-lg>
        {{ entityName(entity) }}
      </q-toolbar-title>
    </common-toolbar>
    <div
      grow
      bg-sur
      of-y-auto
      ref="scrollContainer"
      pos-relative
      @scroll="onScroll"
    >
      <message-item
        class="message-item"
        v-for="message of messages.slice().reverse()"
        :key="message.id"
        :message
        :child-num="1"
        :model-value="1"
        :scroll-container
        :dense="position !== 'full' || $q.screen.lt.md"
        p-4
      />
    </div>
    <div pos-relative>
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
        v-if="channel.message"
        :message="channel.message"
        :parent-id="channel.id"
        :input-types="['*']"
        @send="send"
        v-slot="{ empty }"
      >
        <q-space />
        <q-btn
          :disable="empty"
          @click="send"
          :label="t('Send')"
          icon="sym_o_send"
          unelevated
          color="primary"
        />
      </message-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import { inject, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import type { SpliceListOptions } from 'src/utils/functions'
import { spliceList } from 'src/utils/functions'
import { queries, type FullChannel, type FullMessage } from 'app/src-shared/queries'
import { useThisEntityConf } from 'src/composables/entity-conf'
import type { LayoutPosition } from 'src/utils/types'
import { entityName } from 'src/utils/defaults'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import { useQuery } from 'src/composables/zero/query'
import MessageInput from 'src/components/MessageInput.vue'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import { genId } from 'app/src-shared/utils/id'
import { flush } from 'src/composables/state-proxy'
import { t } from 'src/utils/i18n'
import { useChatScroll } from 'src/composables/chat-scroll'
import MessageItem from 'src/components/MessageItem.vue'

const props = defineProps<{
  channel: FullChannel
}>()

const position = inject<Ref<LayoutPosition>>('position')!

const { entity } = useThisEntityConf()

const messages = reactive<FullMessage[]>([])
function spliceMessages(items, options: SpliceListOptions) {
  spliceList(messages, items, [['sentAt', 'desc'], ['id', 'desc']], options)
}
watch(() => props.channel.id, () => {
  start.value = null
  messages.splice(0)
})
watch(() => props.channel.messages, messages => {
  spliceMessages(messages, { noMore: messages.length < 20 })
}, { deep: 1, immediate: true })
const start = ref<{ sentAt: number, id: string } | null>(null)
const { data: historyMessages } = useQuery(
  () => start.value
    ? queries.channelMessages({ id: props.channel.id, start: start.value, limit: 40 })
    : null,
)
let noMore = false
watch(historyMessages, messages => {
  if (!messages) return
  noMore = messages.length < 40
  spliceMessages(messages, { start: start.value, noMore })
}, { deep: 1 })
function loadMore() {
  const { sentAt, id } = messages[messages.length - 1]
  start.value = { sentAt: sentAt!, id }
}

function onScroll(ev: Event) {
  const container = ev.target as HTMLElement
  if (container.scrollTop < 200 && !noMore) {
    loadMore()
  }
}

const scrollContainer = useTemplateRef('scrollContainer')
const { scroll } = useChatScroll(scrollContainer)
watch(() => props.channel.id, () => {
  nextTick(() => {
    scroll('bottom', 'auto')
  })
}, { immediate: true })

function send() {
  const { id } = props.channel.message!
  flush(id)
  mutate(mutators.sendChannelMessage({
    id,
    draftMessageId: genId(),
    sentAt: Date.now(),
  }))
}
</script>
