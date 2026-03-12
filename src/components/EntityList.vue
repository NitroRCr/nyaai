<template>
  <div flex="~ col">
    <div
      flex
      items-center
      text-on-sur-var
      px-2
      of-x-auto
    >
      <q-btn
        v-if="dir?.parent"
        flat
        dense
        icon="sym_o_arrow_upward"
        text="10px"
        @click="dirId = dir.parent.id"
        h="32px"
        mr-1
      />
      <template
        v-for="(entity, index) in pathEntities"
        :key="entity.id"
      >
        <q-icon
          v-if="index !== 0"
          name="sym_o_keyboard_arrow_right"
          text="16px"
        />
        <q-btn
          flat
          dense
          no-caps
          @click="dirId = entity.id"
          :title="entityName(entity)"
          font-normal
          @drop="onDrop($event, entity.id)"
          v-on="dragHoverListeners"
          transition="background-color 250"
          no-wrap
          :class="{ 'min-w-50px of-hidden': displayLength(entityName(entity)) > 10 }"
        >
          <span
            of-hidden
            text-ellipsis
          >{{ entityName(entity) }}</span>
        </q-btn>
      </template>
      <q-space />
      <slot name="actions" />
      <entity-list-options-btn
        v-model="listOptions"
        flat
        icon="sym_o_sort"
        un-size="32px"
        size="sm"
      />
    </div>
    <div
      flex-1
      of-y-auto
      px-2
      @scroll="onScroll"
      @drop.self="onDrop($event, dirId)"
      @dragover.self.prevent
    >
      <q-list ref="listRef">
        <entity-item
          v-for="entity of children.filter(x => !props.exclude?.includes(x.id))"
          :key="entity.id"
          :to="entityRoute(entity.type, entity.id)"
          :active="activeEntitiesStore.activeIds.includes(entity.id)"
          clickable
          @click.prevent="onEntityClick(entity)"
          :entity
          draggable="true"
          @dragstart="onDragstart($event, entity.id)"
          @drop="onDrop($event, entity.id)"
          v-on="dragHoverListeners"
          :selectable="selected.size > 0"
          :selected="selected.has(entity.id)"
          @contextmenu="onContextmenu(entity.id)"
        >
          <template #actions>
            <q-btn
              v-if="entity.type === 'shortcut'"
              @click.prevent.stop="editShortcut(entity.id)"
              icon="sym_o_edit"
              :title="t('Edit Shortcut')"
              flat
              round
              size="sm"
              transition="opacity 250"
              op-0
              group-hover:op-100
            />
            <q-btn
              v-else-if="entity.type !== 'folder'"
              @click.prevent.stop="dirId = entity.id"
              icon="sym_o_login"
              :title="t('Enter Directory')"
              flat
              round
              size="sm"
              transition="opacity 250"
              op-0
              group-hover:op-100
            />
          </template>
        </entity-item>
      </q-list>
      <q-menu context-menu>
        <q-list ref="menuListRef">
          <template v-if="selected.size">
            <menu-item
              :label="t('Rename')"
              icon="sym_o_edit"
              @click="renameSelected"
            />
            <menu-item
              v-if="selectedOne?.type === 'chat'"
              :label="t('Summarize title')"
              icon="sym_o_auto_fix"
              @click="summarizeChatTitle(selectedOne.id)"
            />
            <menu-item
              v-if="selectedOne"
              :label="t('Change Icon')"
              icon="sym_o_interests"
              @click="changeIcon"
            />
            <menu-item
              :label="t('Move')"
              icon="sym_o_move_item"
              @click="moveSelected"
            />
            <template v-if="selectedOne">
              <menu-item
                v-if="selectedOne.pubRoot"
                :label="t('Manage Publication')"
                icon="sym_o_publish"
                to="/published"
              />
              <menu-item
                v-else
                :label="t('Publish')"
                icon="sym_o_publish"
                @click="publish"
              />
              <menu-item
                :label="t('Properties')"
                icon="sym_o_settings"
                :active="false"
                :to="entityRoute('folder', selectedOne.id)"
              />
            </template>
            <menu-item
              :label="t('Move to Trash')"
              icon="sym_o_delete"
              @click="recycleSelected"
              hover:text-err
            />
          </template>
          <menu-item
            v-else
            :label="t('Properties')"
            icon="sym_o_settings"
            :active="false"
            :to="entityRoute('folder', dirId)"
          />
        </q-list>
      </q-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FullEntity } from 'app/src-shared/queries'
import { queries } from 'app/src-shared/queries'
import { useQuery } from 'src/composables/zero/query'
import { mutate, z } from 'src/utils/zero-session'
import type { SpliceListOptions } from 'src/utils/functions'
import { arrayToMap, displayLength, entityRoute, expandAncestors, spliceList } from 'src/utils/functions'
import { computed, onUnmounted, reactive, ref, useTemplateRef, watch } from 'vue'
import EntityItem from './EntityItem.vue'
import { t } from 'src/utils/i18n'
import { copyToClipboard, QList, QMenu, useQuasar } from 'quasar'
import MenuItem from './MenuItem.vue'
import { mutators } from 'app/src-shared/mutators'
import { useWorkspaceStore } from 'src/stores/workspace'
import { entityAvatar, entityName } from 'src/utils/defaults'
import { useActiveEntitiesStore } from 'src/stores/active-entities'
import type { Avatar, EntityListOptions, EntityStart } from 'app/src-shared/utils/validators'
import EntityListOptionsBtn from './EntityListOptionsBtn.vue'
import SelectDirDialog from './SelectDirDialog.vue'
import PickAvatarDialog from './PickAvatarDialog.vue'
import UpdateShortcutDialog from './UpdateShortcutDialog.vue'
import { parseText } from 'src/utils/file-parse'
import { genId } from 'app/src-shared/utils/id'
import { upload } from 'src/utils/blob-cache'
import { generateChatTitle } from 'src/services/generate-chat-title'
import { useEntityConf } from 'src/composables/entity-conf'

const emit = defineEmits<{
  entityClick: [entity: FullEntity]
}>()

const props = defineProps<{
  rootId?: string
  exclude?: string[]
  selected?: Set<string>
  listOptionsOverride?: Partial<EntityListOptions>
}>()

const selected = reactive(props.selected ?? new Set<string>())

const dirId = defineModel<string>({ required: true })
const workspaceStore = useWorkspaceStore()
const listOptions = ref<EntityListOptions>({
  type: null,
  hidden: false,
  orderBy: ['id', 'desc'],
  ...props.listOptionsOverride,
})
const { data: dir } = useQuery(() => queries.entity({
  id: dirId.value,
  parent: { depth: 5 },
  children: { depth: 1, limit: 40, ...listOptions.value },
}), {
  onNotFound() {
    dirId.value = workspaceStore.id!
  },
})
const children = reactive<FullEntity[]>([])
const childrenMap = computed(() => arrayToMap(children, x => x.id))

watch([dirId, listOptions], () => {
  start.value = null
  children.splice(0)
})

function spliceChildren(val: FullEntity[], options: SpliceListOptions) {
  spliceList(children, val, [['sortPriority', 'desc'], listOptions.value.orderBy, ['id', 'asc']], options)
}
watch(() => dir.value?.children, val => {
  val && spliceChildren(val, { noMore: val.length < 40 })
}, { deep: 1, immediate: true })
const start = ref<EntityStart | null>(null)
const {
  data: dirWithMoreChildren,
} = useQuery(
  () => start.value
    ? queries.entity({
      id: dirId.value,
      children: { depth: 1, limit: 80, ...listOptions.value, start: start.value },
    })
    : null,
)
let noMore = false
watch(() => dirWithMoreChildren.value?.children, val => {
  if (!val) return
  noMore = val.length < 80
  spliceChildren(val, { start: start.value, noMore })
}, { deep: 1 })
function loadMore() {
  start.value = children.at(-1)!
}
function onScroll(ev: Event) {
  const container = ev.target as HTMLElement
  if (container.scrollHeight - container.scrollTop - container.clientHeight < 200 && !noMore) {
    loadMore()
  }
}

const pathEntities = computed(() => dir.value ? expandAncestors(dir.value, props.rootId) : [])

const $q = useQuasar()

const dragHoverListeners = {
  dragover(event: DragEvent) {
    event.preventDefault()
  },
  dragenter({ currentTarget }: { currentTarget: HTMLElement }) {
    currentTarget.classList.add('bg-sur-dim')
  },
  dragleave({ currentTarget, relatedTarget }: { currentTarget: HTMLElement, relatedTarget: Node | null }) {
    if (relatedTarget && currentTarget.contains(relatedTarget)) return
    currentTarget.classList.remove('bg-sur-dim')
  },
  drop({ currentTarget }: { currentTarget: HTMLElement }) {
    currentTarget.classList.remove('bg-sur-dim')
  },
}

function onDragstart({ dataTransfer }: DragEvent, id: string) {
  if (!dataTransfer) return
  dataTransfer.setData('application/x-entity-id', id)
  dataTransfer.effectAllowed = 'move'
}
function onDrop({ dataTransfer }: DragEvent, id: string) {
  if (!dataTransfer) return
  handleFiles(Array.from(dataTransfer.files), id)
  const sourceId = dataTransfer.getData('application/x-entity-id')
  if (!sourceId) return
  if (!selected.has(sourceId)) {
    if (sourceId === id) return
    mutate(mutators.moveEntities({
      ids: [sourceId],
      to: id,
    }))
  } else {
    if (selected.has(id)) return
    mutate(mutators.moveEntities({
      ids: Array.from(selected),
      to: id,
    }))
  }
  exitSelectMode()
}
async function handleFiles(files: File[], parentId: string) {
  for (const file of files) {
    const id = genId()
    mutate(mutators.createItem({
      id,
      parentId,
      name: file.name,
      mimeType: file.type,
      ...await parseText(file),
    }))
    upload(id, file, file.name)
  }
}

const activeEntitiesStore = useActiveEntitiesStore()

function onEntityClick(entity: FullEntity) {
  if (selected.size) {
    selected.has(entity.id) ? selected.delete(entity.id) : selected.add(entity.id)
  } else if (entity.type === 'folder') {
    dirId.value = entity.id
  } else {
    emit('entityClick', entity)
  }
}
const listRef = useTemplateRef('listRef')
const menuListRef = useTemplateRef('menuListRef')
function onContextmenu(id: string) {
  document.addEventListener('click', clickListener)
  selected.add(id)
}
const clickListener = (ev: MouseEvent) => {
  if (listRef.value?.$el?.contains(ev.target) || menuListRef.value?.$el?.contains(ev.target)) return
  exitSelectMode()
}
function exitSelectMode() {
  selected.clear()
  document.removeEventListener('click', clickListener)
}
onUnmounted(exitSelectMode)

const selectedOne = computed(() => selected.size === 1 ? childrenMap.value[selected.values().next().value!] : null)

function recycleSelected() {
  mutate(mutators.recycleEntities({
    workspaceId: workspaceStore.id!,
    ids: Array.from(selected),
  }))
  exitSelectMode()
}
function renameSelected() {
  $q.dialog({
    title: t('Rename'),
    prompt: {
      model: selectedOne.value?.name ?? '',
      label: t('Name'),
    },
    cancel: true,
    ok: t('Rename'),
  }).onOk(name => {
    selected.forEach(id => {
      mutate(mutators.updateEntity({
        id,
        name,
      }))
    })
  })
}
function moveSelected() {
  const _selected = Array.from(selected)
  $q.dialog({
    component: SelectDirDialog,
    componentProps: {
      title: t('Move to'),
      exclude: _selected,
    },
  }).onOk((dirId: string) => {
    mutate(mutators.moveEntities({
      ids: _selected,
      to: dirId,
    }))
  })
}
function publish() {
  const entity = selectedOne.value!
  $q.dialog({
    title: t('Publish'),
    message: t('After publishing it, "{0}" and all its sub-items will be publicly visible.', entityName(entity)),
    cancel: true,
    ok: t('Publish'),
  }).onOk(() => {
    mutate(mutators.publishEntity(entity.id)).client.then(() => {
      $q.notify({
        message: t('Published'),
        color: 'inv-sur',
        textColor: 'inv-on-sur',
        actions: [{
          label: t('Copy Link'),
          handler() {
            copyToClipboard(`${location.origin}/${entity.type}/${entity.id}`)
          },
          textColor: 'inv-pri',
        }],
      })
    })
  })
}
function editShortcut(id: string) {
  const shortcut = activeEntitiesStore.shortcuts.find(s => s.id === id)
  if (!shortcut) return
  $q.dialog({
    component: UpdateShortcutDialog,
    componentProps: {
      id: shortcut.id,
    },
  })
}
function changeIcon() {
  const entity = selectedOne.value!
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      defaultTab: 'icon',
      model: entityAvatar(entity),
      parentId: entity.id,
    },
  }).onOk((avatar: Avatar) => {
    mutate(mutators.updateEntity({
      id: entity.id,
      avatar,
    }))
  })
}

const { conf } = useEntityConf(dir)
async function summarizeChatTitle(id: string) {
  const chat = await z.run(queries.fullChat(id), { type: 'complete' })
  chat && await generateChatTitle({ chat, conf: conf.value }).catch(err => {
    console.error(err)
    $q.notify({
      message: t('Failed to generate chat title: {0}', err.message),
      color: 'negative',
    })
  })
}
</script>
