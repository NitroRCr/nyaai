<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    no-refocus
    position="top"
    :transition-duration="200"
  >
    <q-card
      bg-sur
      style="width: min(90vw, 500px)"
      py-2
    >
      <div
        flex
        gap-2
        px-2
      >
        <a-input
          v-model="args.query"
          :debounce="300"
          outlined
          dense
          clearable
          class="grow"
          autofocus
          :placeholder="t('Search…')"
          @keydown="onKeyDown"
        />
        <q-select
          :label="t('Type')"
          v-model="args.types"
          multiple
          :options="[
            { label: t('Chat'), value: 'chat' },
            { label: t('Page'), value: 'page' },
            { label: t('Channel'), value: 'channel' },
            { label: t('Translation'), value: 'translation' },
            { label: t('File'), value: 'item' },
          ]"
          map-options
          emit-value
          dense
          class="min-w-60px"
        />
      </div>
      <div
        max-h="60vh"
        overflow-y-auto
        px-2
      >
        <div
          v-if="loading"
          mt-2
        >
          <q-linear-progress indeterminate />
        </div>
        <q-list
          v-else-if="rows"
          ref="listRef"
          mt-2
        >
          <q-item
            v-if="!rows.length"
            min-h="40px"
          >
            <q-item-section>
              <q-item-label text-on-sur-var>
                {{ t('No results found') }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            v-for="(r, i) in rows"
            :key="r.id"
            :class="{ 'bg-sur-c-high': i === focusedIndex }"
            item-rd
            :to="getRoute(r)"
          >
            <q-item-section
              avatar
              min-w-0
            >
              <a-avatar
                :avatar="entityAvatar({ type: r.type, id: r.entityId, name: r.name, avatar: null })"
                size="32px"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ entityName({ type: r.type, id: r.entityId, name: r.name, avatar: null }) }}</q-item-label>
              <q-item-label
                caption
                lines="2"
                v-if="r.content"
              >
                {{ getSnippet(r.content, r.words) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, QList } from 'quasar'
import { reactive, ref, watch, nextTick, useTemplateRef } from 'vue'
import AInput from './AInput'
import AAvatar from './AAvatar.vue'
import { t } from 'src/utils/i18n'
import type { EntityType } from 'app/src-shared/utils/validators'
import { useWorkspaceStore } from 'src/stores/workspace'
import { cjkReg, textBeginning } from 'src/utils/functions'
import { entityAvatar, entityName } from 'src/utils/defaults'
import { useRouter } from 'vue-router'
import { client } from 'src/utils/hc'
import { entityTypeSchema } from 'app/src-shared/utils/validators'
import type { SearchResult } from 'app/src-shared/utils/types'
import Mark from 'mark.js'

const args = reactive({
  query: '',
  types: [] as EntityType[],
})

const workspaceStore = useWorkspaceStore()
const router = useRouter()

const rows = ref<SearchResult[] | null>(null)
const loading = ref(false)
const focusedIndex = ref(0)
const listRef = useTemplateRef('listRef')

function unmark() {
  if (!listRef.value) return
  const mark = new Mark(listRef.value.$el)
  mark.unmark()
}

function highlight(words: string[]) {
  if (!listRef.value) return
  const mark = new Mark(listRef.value.$el)
  mark.mark(words, { element: 'b' })
}

function getSnippet(content: string, words: string[] | null, maxLength = 200) {
  if (!content) return ''

  if (!words?.length) return textBeginning(content, maxLength)

  let firstIndex = -1

  for (const word of words) {
    const idx = content.indexOf(word)
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx
    }
  }

  if (firstIndex === -1) textBeginning(content, maxLength)

  const start = Math.max(0, firstIndex - (cjkReg.test(content) ? 25 : 50))
  const prefix = start > 0 ? '…' : ''

  return prefix + textBeginning(content.slice(start), maxLength)
}

watch(args, async () => {
  if (!args.query) {
    rows.value = null
    focusedIndex.value = 0
    return
  }

  loading.value = true
  try {
    const types = args.types.length ? args.types : entityTypeSchema.options
    const res = await client.api.search.$post({
      json: {
        workspaceId: workspaceStore.id!,
        q: args.query,
        types,
      },
    })
    if (res.ok) {
      unmark()
      rows.value = await res.json()
      focusedIndex.value = 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
    nextTick(() => {
      if (rows.value) {
        highlight(Array.from(new Set(rows.value.flatMap(r => r.words))))
      }
    })
  }
})

function getRoute(row: SearchResult) {
  return {
    path: `/${row.type}/${row.entityId}`,
    query: row.type === 'chat' ? { messageId: row.id, highlight: row.words } : {},
  }
}

function onKeyDown(ev: KeyboardEvent) {
  if (!rows.value?.length) return
  if (ev.key === 'ArrowDown') {
    focusedIndex.value = (focusedIndex.value + 1) % rows.value.length
  } else if (ev.key === 'ArrowUp') {
    focusedIndex.value = (focusedIndex.value - 1 + rows.value.length) % rows.value.length
  } else if (ev.key === 'Enter') {
    const entity = rows.value[focusedIndex.value]
    entity && router.push(getRoute(entity))
  }
}

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>
