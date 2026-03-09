<template>
  <div
    :id
    flex
    rd
    of-hidden
  />
</template>

<script setup lang="ts">
import { genId } from 'app/src-shared/utils/id'
import { basicEditor } from 'prism-code-editor/setups'
import { onBeforeUnmount, onMounted, watch } from 'vue'
import 'prism-code-editor/prism/languages/common'
import 'prism-code-editor/prism/languages/vue'
import 'prism-code-editor/languages'
import { Dark } from 'quasar'

const id = `editor-${genId()}`

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let editor: ReturnType<typeof basicEditor> | null = null
onMounted(() => {
  editor = basicEditor(
  `#${id}`,
  {
    language: props.language,
    value: props.modelValue,
    theme: Dark.isActive ? 'atom-one-dark' : 'github-light',
    onUpdate(value) {
      emit('update:modelValue', value)
    },
  },
  )
})
watch(() => Dark.isActive, dark => {
  editor?.setOptions({
    theme: dark ? 'atom-one-dark' : 'github-light',
  })
})
onBeforeUnmount(() => {
  editor?.remove()
  editor = null
})

watch(() => props.language, () => {
  if (!editor) return
  editor.setOptions({
    language: props.language,
  })
})

watch(() => props.modelValue, () => {
  if (!editor) return
  if (editor.value !== props.modelValue) {
    editor.setOptions({
      value: props.modelValue,
    })
  }
})
</script>
