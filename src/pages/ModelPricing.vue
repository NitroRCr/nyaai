<template>
  <q-header
    bg-sur-c-low
    text-on-sur
  >
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="sym_o_menu"
        @click="uiStateStore.mainDrawerOpen = !uiStateStore.mainDrawerOpen"
      />
      <q-toolbar-title>
        {{ t('Model Pricing') }}
      </q-toolbar-title>
    </q-toolbar>
  </q-header>
  <q-page-container>
    <q-page p-4>
      <div>
        <div
          text-lg
          mt-4
        >
          {{ t('Usage Estimation') }}
        </div>
        <div
          flex
          gap-2
          mt-2
        >
          <q-input
            v-model.number="usage.quota"
            type="number"
            @update:model-value="calc('quota')"
            :label="t('Quota')"
            filled
            prefix="$"
            class="flex-1"
          />
          <q-select
            v-model="usage.model"
            :options="modelOptions"
            :label="t('Model')"
            @update:model-value="calc('quota')"
            filled
            class="flex-1"
          >
            <template #option="{ opt: model, itemProps }">
              <dense-item
                :label="modelName(model)"
                :caption="model.caption"
                :avatar="modelAvatar(model)"
                v-bind="itemProps"
              />
            </template>
          </q-select>
          <q-input
            v-model.number="usage.output"
            type="number"
            @update:model-value="calc('output')"
            filled
            :label="t('Output Words')"
            class="flex-1"
          />
        </div>
        <div
          mt-2
          text="on-sur-var xs"
        >
          * {{ t('This data is provided for reference purposes only. The output includes reasoning content; actual requests must also account for input costs.') }}
        </div>
      </div>
      <div mt-4>
        <div
          text-lg
          my-2
        >
          {{ t('Model List') }}
        </div>
        <q-table
          :rows
          :columns
          :pagination="{ rowsPerPage: Infinity }"
          row-key="id"
          :no-data-label="t('No platform models')"
          hide-pagination
          flat
          bg-sur-c-low
          mt-4
        />
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import { locale, t } from 'src/utils/i18n'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import { modelAvatar, modelName } from 'src/utils/defaults'
import type { Row } from '@rocicorp/zero'
import { useUiStateStore } from 'src/stores/ui-state'
import { reactive, computed } from 'vue'
import { until } from '@vueuse/core'
import DenseItem from 'src/components/DenseItem.vue'

const uiStateStore = useUiStateStore()

const columns: QTableColumn<Row['model']>[] = [
  { name: 'name', label: t('Model Name'), field: row => modelName(row), align: 'left', sortable: true },
  { name: 'caption', label: t('Caption'), field: 'caption' },
  { name: 'inputPrice', label: t('Input Price'), field: 'inputPrice', format: val => val ? `$${val} / M Tokens` : t('Free'), sortable: true },
  { name: 'outputPrice', label: t('Output Price'), field: 'outputPrice', format: val => val ? `$${val} / M Tokens` : t('Free'), sortable: true },
]

const { data: rows, status } = useQuery(queries.publicModels())

const modelOptions = computed(() => rows.value.filter(m => m.outputPrice))

const usage = reactive({
  quota: 1,
  model: null as Row['model'] | null | undefined,
  output: null as number | null,
})
function calc(accord: 'quota' | 'output') {
  if (accord === 'quota') {
    usage.output = Math.round(usage.quota / costPerWord(usage.model!))
  } else {
    usage.quota = usage.output! * costPerWord(usage.model!)
  }
}
const wordsPerMTokens = locale.startsWith('zh') ? 1500_000 : 666_666
function costPerWord(model: Row['model']) {
  return model.outputPrice! / wordsPerMTokens
}
until(status).toBe('complete').then(() => {
  usage.model = rows.value[0]
  calc('quota')
})
</script>
