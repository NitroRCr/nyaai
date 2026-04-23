<template>
  <q-list
    bg-sur-c
    shadow-default
    max-h="400px"
    of-y-auto
  >
    <template v-if="items.length">
      <menu-item
        :class="{ 'bg-sur-dim': index === selectedIndex }"
        v-for="(item, index) in items"
        :key="index"
        @click="selectItem(index)"
        :label="item.title"
        :icon="item.icon"
      >
        <q-item-section
          side
          v-if="item.shortcut"
          text="xs out"
          ml-4
        >
          {{ item.shortcut }}
        </q-item-section>
      </menu-item>
    </template>
  </q-list>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import MenuItem from 'src/components/MenuItem.vue'

interface Item {
  title: string
  icon: string
  shortcut?: string
}

interface Props {
  items: Item[]
  command: (item: Item) => void
}

const props = defineProps<Props>()

const selectedIndex = ref(0)

watch(() => props.items, () => {
  selectedIndex.value = 0
})

const onKeyDown = ({ event }: { event: KeyboardEvent }): boolean => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'Enter') {
    enterHandler()
    return true
  }

  return false
}

const upHandler = () => {
  selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
}

const downHandler = () => {
  selectedIndex.value = (selectedIndex.value + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex.value)
}

const selectItem = (index: number) => {
  const item = props.items[index]

  if (item) {
    props.command(item)
  }
}

defineExpose({
  onKeyDown,
})
</script>
