<template>
  <div
    view-styles
  >
    <common-toolbar>
      <q-toolbar-title>{{ t('Translate') }}</q-toolbar-title>
    </common-toolbar>
    <div p-4>
      <div
        flex
        items-center
        gap-2
      >
        <autocomplete-input
          :options="conf.translationLanguageOptions"
          :model-value="record.from"
          @update:model-value="update({ from: $event })"
          :placeholder="t('Detect language')"
          dense
          field-sizing-content
          class="flex-1"
        />
        <q-btn
          @click="swapLanguages"
          icon="sym_o_swap_horiz"
          :title="t('Swap languages')"
          flat
          round
          dense
        />
        <autocomplete-input
          :options="conf.translationLanguageOptions"
          :model-value="record.to"
          @update:model-value="update({ to: $event })"
          :placeholder="t('Auto')"
          dense
          field-sizing-content
          class="flex-1"
        />
      </div>
      <div
        flex
        :class="{ 'flex-col': $q.screen.lt.sm}"
        mt-4
        gap-2
      >
        <div
          class="flex-1"
          pos-relative
          box-border
        >
          <a-input
            class="translation-input"
            :model-value="recordProxy.input"
            @update:model-value="updateProxy({ input: $event as string })"
            outlined
            autogrow
            autofocus
            field-sizing-content
            important:min-h="200px"
            @keydown.enter="onEnter"
            pb="50px"
          />
          <div
            pos-absolute
            bottom-2
            left-3
            right-3
            flex
            items-center
          >
            <q-pagination
              v-if="translation.records.length > 1"
              :model-value="translation.currentIndex + 1"
              @update:model-value="switchRecord($event - 1)"
              :max="translation.records.length"
              :boundary-links="false"
              input
            />
            <q-btn
              flat
              dense
              round
              icon="sym_o_content_paste"
              text-on-sur-var
              @click="paste"
            />
            <q-btn
              :loading
              :disable="!!currentRecord.output"
              @click="translate"
              :label="t('Translate')"
              bg-pri-c
              text-on-pri-c
              unelevated
              ml-a
            />
          </div>
        </div>
        <div
          flex-1
          bg-sur-c-low
          rd
        >
          <div
            px-3
            h-full
            flex="~ col"
          >
            <pre
              whitespace-pre-wrap
              grow
            >{{ record.output }}</pre>
            <div
              py-2
              flex
            >
              <copy-btn
                v-if="record.output"
                :value="record.output"
                flat
                dense
                round
                text-on-sur-var
                ml-a
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Row } from '@rocicorp/zero'
import { generateText, Output } from 'ai'
import { mutators } from 'app/src-shared/mutators'
import { queries, type FullTranslation } from 'app/src-shared/queries'
import { genId } from 'app/src-shared/utils/id'
import { useQuasar } from 'quasar'
import AInput from 'src/components/AInput'
import AutocompleteInput from 'src/components/AutocompleteInput.vue'
import { useThisEntityConf } from 'src/composables/entity-conf'
import { usePerfsState } from 'src/composables/perfs-state'
import { useEditProxy } from 'src/composables/state-proxy'
import { useQuery } from 'src/composables/zero/query'
import { mutate } from 'src/utils/zero-session'
import { t } from 'src/utils/i18n'
import { toSdkModel } from 'src/utils/model'
import { engine } from 'src/utils/template-engine'
import { computed, ref } from 'vue'
import { z } from 'zod'
import { usePerfsStore } from 'src/stores/perfs'
import { shortcutKeyMatch, textBeginning } from 'src/utils/functions'
import { useRoute, useRouter } from 'vue-router'
import CommonToolbar from 'src/components/CommonToolbar.vue'
import CopyBtn from 'src/components/CopyBtn.vue'

const props = defineProps<{
  translation: FullTranslation
}>()

const { perfs: record } = usePerfsState(
  computed(() => props.translation.records.slice(0, props.translation.currentIndex + 1)),
  {
    id: '$default',
    input: '' as string | null,
    output: '' as string | null,
    from: null as string | null,
    to: null as string | null,
  },
  [undefined, null],
)

const currentRecord = computed(() => props.translation.records[props.translation.currentIndex])
const inputing = computed(() => !currentRecord.value.output && !loading.value)

async function createRecord(initial: Partial<Row['translationRecord']>) {
  await mutate(mutators.spliceTranslationRecord([
    currentRecord.value.id,
    { id: genId(), entityId: props.translation.id, ...initial },
  ])).client
}

async function swapLanguages() {
  const { from, to, input, output } = record.value
  await createRecord({
    from: to,
    to: from,
    input: output,
    output: output && input,
  })
  output && translate()
}

const { value: recordProxy, update: updateProxy, flush } = useEditProxy(
  record,
  ['id', 'input'],
  (id, updates) => {
    if (inputing.value) mutate(mutators.updateTranslationRecord({ id, ...updates }))
    else createRecord(updates)
  },
  { type: 'debounce', wait: 1000 },
)

const { conf, entity } = useThisEntityConf()
const { data: model } = useQuery(() => conf.value.translationModelId ? queries.fullModel(conf.value.translationModelId) : null)

const $q = useQuasar()
const loading = ref(false)
function translate() {
  if (!model.value) {
    $q.notify({
      message: t('Please select a model'),
      color: 'negative',
    })
    return
  }
  loading.value = true
  const {
    translationPrompt,
    translationPrimaryLanguage,
    translationSecondaryLanguage,
  } = conf.value
  flush()
  const { id, from, to, input } = recordProxy.value
  generateText({
    ...model.value.settings,
    model: toSdkModel(model.value),
    prompt: engine.parseAndRenderSync(translationPrompt, {
      primaryLanguage: translationPrimaryLanguage,
      secondaryLanguage: translationSecondaryLanguage,
      from,
      to,
      input,
    }),
    output: Output.object({
      schema: z.object({
        output: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    }),
  }).then(res => {
    mutate(mutators.updateTranslationRecord({
      id,
      ...res.output,
    }))
    if (!entity.value!.name) {
      mutate(mutators.updateEntity({
        id: entity.value!.id,
        name: textBeginning(input!, 16),
      }))
    }
  }).catch(err => {
    console.error(err)
    $q.notify({
      message: t('Failed to translate: {0}', err.message),
      color: 'negative',
    })
  }).finally(() => {
    loading.value = false
  })
}

function switchRecord(index: number) {
  mutate(mutators.updateTranslation({ id: props.translation.id, currentIndex: index }))
}

function update(updates: Partial<Row['translationRecord']>) {
  mutate(mutators.updateTranslationRecord({
    id: currentRecord.value.id,
    ...updates,
  }))
}

const perfsStore = usePerfsStore()
function onEnter(ev: KeyboardEvent) {
  if (currentRecord.value.output) return
  if (shortcutKeyMatch(perfsStore.perfs.translateKey, ev)) {
    ev.preventDefault()
    translate()
  }
}

const route = useRoute()
const router = useRouter()
if (route.hash === '#translate') {
  translate()
  router.replace({ query: route.query })
}

async function paste() {
  const text = await navigator.clipboard.readText()
  updateProxy({ input: text })
  flush()
  translate()
}
</script>
<style lang="scss" scoped>
.translation-input {
  height: 100%;
  :is(.q-field__control) {
    height: 100%;
  }
}
</style>
