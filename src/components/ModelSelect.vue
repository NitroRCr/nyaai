<template>
  <q-select
    :model-value="options.find(x => x.value === modelId) ?? modelId"
    @update:model-value="modelId = $event.value"
    :options="filteredOptions"
    @filter="filterFn"
    use-input
    hide-selected
    fill-input
    :input-debounce="0"
  >
    <template #option="{ opt: { label, caption, avatar }, itemProps }">
      <dense-item
        :label
        :caption
        :avatar
        v-bind="itemProps"
      />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { queries } from 'app/src-shared/queries'
import { useQuery } from 'src/composables/zero/query'
import { computed, ref } from 'vue'
import DenseItem from './DenseItem.vue'
import { modelAvatar } from 'src/utils/defaults'
import type { QSelectProps } from 'quasar'
import { filterOptions } from 'src/utils/functions'
import type { Row } from '@rocicorp/zero'

const props = defineProps<{
  workspaceId?: string | null
}>()

const modelId = defineModel<string | null>({ required: true })

const { data: models } = useQuery(() => props.workspaceId ? queries.models(props.workspaceId) : null, {
  emptyValue: [] as Row['model'][],
})
const { data: publicModels } = useQuery(() => queries.publicModels())
const options = computed(() => models.value.concat(publicModels.value).map(x => ({
  label: x.label || x.name,
  caption: x.caption,
  value: x.id,
  avatar: modelAvatar(x),
})))
const filteredOptions = ref(options.value)
const filterFn: QSelectProps['onFilter'] = (val, update) => {
  update(() => {
    filteredOptions.value = val ? filterOptions(options.value, val, x => x.label) : options.value
  })
}
</script>
