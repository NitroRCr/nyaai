<template>
  <common-item
    :label
    clickable
    @click="selectDir"
  >
    {{ text }}
  </common-item>
</template>
<script setup lang="ts">
import { useQuery } from 'src/composables/zero/query'
import CommonItem from './CommonItem.vue'
import { queries } from 'app/src-shared/queries'
import { expandAncestors } from 'src/utils/functions'
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import SelectDirDialog from './SelectDirDialog.vue'
import { entityName } from 'src/utils/defaults'

defineProps<{
  label: string
}>()

const dirId = defineModel<string | null>()

const { data: dir } = useQuery(() => dirId.value ? queries.entity({ id: dirId.value, parent: { depth: 5 } }) : null)
const text = computed(() => {
  if (!dir.value) return ''
  return expandAncestors(dir.value).slice(1).map(d => entityName(d)).join('/')
})

const $q = useQuasar()
function selectDir() {
  $q.dialog({
    component: SelectDirDialog,
  }).onOk((val: string) => {
    dirId.value = val
  })
}
</script>
