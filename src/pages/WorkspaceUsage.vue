<template>
  <q-page-container>
    <q-page p-4>
      <div
        flex
        :class="$q.screen.lt.sm ? 'flex-col' : 'flex-row'"
        gap-2
      >
        <div
          text-lg
          py-1
        >
          {{ t('AI quota usage logs') }}
        </div>
        <q-input
          :label="t('From')"
          v-model="range.from"
          type="datetime-local"
          dense
          filled
          :class="{ 'ml-a': $q.screen.gt.xs }"
        />
        <q-input
          :label="t('To')"
          v-model="range.to"
          type="datetime-local"
          dense
          filled
        />
        <q-btn
          :label="t('Model Pricing')"
          class="pricing-btn"
          icon="sym_o_sell"
          no-caps
          to="/models"
          bg-pri-c
          text-on-pri-c
          unelevated
          flex-self-stretch
        />
      </div>
      <q-table
        :rows
        :columns
        :pagination="{ rowsPerPage: Infinity }"
        row-key="id"
        :no-data-label="t('No logs')"
        hide-pagination
        flat
        bg-sur-c-low
        mt-4
      />
    </q-page>
  </q-page-container>
</template>
<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import { t } from 'src/utils/i18n'
import { useQuery } from 'src/composables/zero/query'
import type { FullUsage } from 'app/src-shared/queries'
import { queries } from 'app/src-shared/queries'
import { useWorkspaceStore } from 'src/stores/workspace'
import { idDateString, timestampHash } from 'app/src-shared/utils/id'
import { reactive } from 'vue'

const columns: QTableColumn<FullUsage>[] = [
  { name: 'time', label: t('Time'), field: 'id', format: idDateString, align: 'left' },
  { name: 'model', label: t('Model'), field: 'modelName' },
  { name: 'cost', label: t('Cost'), field: 'cost', format: cost => `$${cost.toFixed(8)}` },
  { name: 'details', label: t('Details'), field: 'details' },
  { name: 'user', label: t('User'), field: 'user', format: user => user.name },
]

const range = reactive({
  from: '',
  to: '',
})

function dateStrToHash(str: string) {
  return str ? timestampHash(new Date(str).getTime()) : null
}

const workspaceStore = useWorkspaceStore()
const { data: rows } = useQuery(() => queries.workspaceUsages({
  workspaceId: workspaceStore.id!,
  from: dateStrToHash(range.from),
  to: dateStrToHash(range.to),
}))
</script>
<style lang="scss" scoped>
.pricing-btn {
  :is(.q-icon) {
    font-size: 20px;
    margin-right: 8px;
  }
}
</style>
