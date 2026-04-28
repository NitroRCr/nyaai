<template>
  <teleport to="body">
    <!-- Row Handle -->
    <div
      v-if="show"
      class="absolute z-10 flex items-center justify-center cursor-pointer transition-colors"
      :style="{
        top: `${rowHandleTop}px`,
        left: `${tableLeft - 26}px`,
        width: '24px',
        height: '24px',
        transform: 'translateY(-50%)'
      }"
    >
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="sym_o_drag_indicator"
        text-on-sur-var
      >
        <q-menu :transition-duration="200">
          <q-list
            dense
            class="min-w-150px"
          >
            <menu-item
              v-if="isFirstRow"
              icon="sym_o_pivot_table_chart"
              :label="t('Header Row')"
              @click="editor?.chain().focus().toggleHeaderRow().run()"
              :class="{ 'route-active': editor?.isActive('tableHeader') }"
            />
            <menu-item
              icon="sym_o_vertical_align_top"
              :label="t('Add Row Above')"
              @click="editor?.chain().focus().addRowBefore().run()"
            />
            <menu-item
              icon="sym_o_vertical_align_bottom"
              :label="t('Add Row Below')"
              @click="editor?.chain().focus().addRowAfter().run()"
            />
            <menu-item
              icon="sym_o_delete"
              :label="t('Delete Row')"
              @click="editor?.chain().focus().deleteRow().run()"
              hover:text-err
            />
            <menu-item
              icon="sym_o_delete_forever"
              :label="t('Delete Table')"
              @click="editor?.chain().focus().deleteTable().run()"
              hover:text-err
            />
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <!-- Col Handle -->
    <div
      v-if="show"
      class="absolute z-10 flex items-center justify-center cursor-pointer transition-colors"
      :style="{
        top: `${tableTop - 26}px`,
        left: `${colHandleLeft}px`,
        width: '24px',
        height: '24px',
        transform: 'translateX(-50%)'
      }"
    >
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="sym_o_drag_indicator"
        text-on-sur-var
        style="transform: rotate(90deg)"
      >
        <q-menu
          anchor="top left"
          self="bottom left"
          :transition-duration="200"
        >
          <q-list
            dense
            class="min-w-150px"
          >
            <menu-item
              v-if="isFirstCol"
              icon="sym_o_pivot_table_chart"
              :label="t('Header Column')"
              @click="editor?.chain().focus().toggleHeaderColumn().run()"
              :class="{ 'route-active': editor?.isActive('tableHeader') }"
            />
            <menu-item
              icon="sym_o_horizontal_align_left"
              :label="t('Add Column Left')"
              @click="editor?.chain().focus().addColumnBefore().run()"
            />
            <menu-item
              icon="sym_o_horizontal_align_right"
              :label="t('Add Column Right')"
              @click="editor?.chain().focus().addColumnAfter().run()"
            />
            <menu-item
              icon="sym_o_delete"
              :label="t('Delete Column')"
              @click="editor?.chain().focus().deleteColumn().run()"
              hover:text-err
            />
            <menu-item
              icon="sym_o_delete_forever"
              :label="t('Delete Table')"
              @click="editor?.chain().focus().deleteTable().run()"
              hover:text-err
            />
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import MenuItem from 'src/components/MenuItem.vue'
import { t } from 'src/utils/i18n'

const props = defineProps<{
  editor?: Editor
}>()

const show = ref(false)
const tableTop = ref(0)
const tableLeft = ref(0)
const rowHandleTop = ref(0)
const colHandleLeft = ref(0)
const isFirstRow = ref(false)
const isFirstCol = ref(false)

function updateMenu() {
  if (!props.editor) return
  if (!props.editor.isActive('table')) {
    show.value = false
    return
  }

  const { view } = props.editor
  const { selection } = view.state

  try {
    const domAtPos = view.domAtPos(selection.from)
    let node = domAtPos.node as HTMLElement
    if (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentElement as HTMLElement
    }

    if (!node) {
      show.value = false
      return
    }

    const cell = node.closest<HTMLTableCellElement>('td, th')
    const row = node.closest<HTMLTableRowElement>('tr')
    const table = node.closest('table')

    if (!table || !row || !cell) {
      show.value = false
      return
    }

    const tableRect = table.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()

    tableTop.value = tableRect.top
    tableLeft.value = tableRect.left
    rowHandleTop.value = rowRect.top + rowRect.height / 2
    colHandleLeft.value = cellRect.left + cellRect.width / 2

    isFirstRow.value = row.rowIndex === 0
    isFirstCol.value = cell.cellIndex === 0

    show.value = true
  } catch {
    show.value = false
  }
}

onMounted(() => {
  if (props.editor) {
    props.editor.on('selectionUpdate', updateMenu)
    props.editor.on('update', updateMenu)
  }
  window.addEventListener('scroll', updateMenu, true)
  window.addEventListener('resize', updateMenu)
})

onUnmounted(() => {
  if (props.editor) {
    props.editor.off('selectionUpdate', updateMenu)
    props.editor.off('update', updateMenu)
  }
  window.removeEventListener('scroll', updateMenu, true)
  window.removeEventListener('resize', updateMenu)
})

watch(() => props.editor, (newEditor, oldEditor) => {
  if (oldEditor) {
    oldEditor.off('selectionUpdate', updateMenu)
    oldEditor.off('update', updateMenu)
  }
  if (newEditor) {
    newEditor.on('selectionUpdate', updateMenu)
    newEditor.on('update', updateMenu)
    updateMenu()
  }
})
</script>
