<template>
  <div
    @click="fileInput?.click()"
    @dragenter.prevent
    @dragover.prevent
    @drop.stop.prevent="onDrop"
    border="dashed 2px out"
    h="200px"
    flex
    items-center
    justify-center
    cursor-pointer
  >
    <div text="xl center out">
      {{ t('Click to Select {0}', image ? t('Image') : t('File')) }}<br>
      {{ t('Drag here') }}<br>
      {{ t('Or Ctrl+V to Paste') }}
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="image ? 'image/*' : undefined"
      @change="onInput"
      un-hidden
      :multiple
    >
  </div>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import { onUnmounted, useTemplateRef } from 'vue'

const props = defineProps<{
  image?: boolean
  multiple?: boolean
}>()

const emit = defineEmits<{
  input: [File]
}>()
const fileInput = useTemplateRef('fileInput')

function onInput() {
  if (!fileInput.value?.files) return
  for (const file of fileInput.value.files) {
    if (!props.image || file.type.startsWith('image/')) {
      emit('input', file)
    }
  }
}
function onDrop({ dataTransfer }) {
  for (const file of dataTransfer.files) {
    if (!props.image || file.type.startsWith('image/')) {
      emit('input', file)
      break
    }
  }
}
function onPaste({ clipboardData }) {
  for (const file of clipboardData.files) {
    if (!props.image || file.type.startsWith('image/')) {
      emit('input', file)
      break
    }
  }
}
addEventListener('paste', onPaste)
onUnmounted(() => removeEventListener('paste', onPaste))
</script>
