<template>
  <q-page-container>
    <q-page p-4>
      <div
        flex
        gap-2
      >
        <a-input
          v-model="query.ownerId"
          :label="t('Owner ID')"
          :debounce="200"
          dense
          clearable
        />
        <plan-select
          v-model="query.planId"
          :label="t('Plan')"
          dense
          clearable
          class="w-120px"
        />
      </div>
      <q-table
        :rows
        :columns
        table-class="cursor-pointer"
        hide-bottom
        :pagination="{ rowsPerPage: Infinity }"
        @row-click="(event, row) => updateWorkspace(row)"
        binary-state-sort
        row-key="id"
        flat
        bg-sur-c-low
        mt-4
      />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import type { QTableColumn } from 'quasar'
import { useQuasar } from 'quasar'
import { t } from 'src/utils/i18n'
import { useQuery } from 'src/composables/zero/query'
import { queries } from 'app/src-shared/queries'
import type { Row } from '@rocicorp/zero'
import UpdateWorkspaceDialog from '../components/UpdateWorkspaceDialog.vue'
import { idDateString } from 'app/src-shared/utils/id'
import { formatBytes } from 'src/utils/functions'
import { reactive } from 'vue'
import { useRoute } from 'vue-router'
import AInput from 'src/components/AInput'
import PlanSelect from '../components/PlanSelect.vue'

const columns: QTableColumn[] = [
  { name: 'name', label: t('Name'), field: 'name', align: 'left' },
  { name: 'ownerId', label: t('Owner ID'), field: 'ownerId' },
  { name: 'plan', label: t('Plan'), field: 'plan', format: plan => plan?.name },
  { name: 'payment', label: t('Payment'), field: 'payment', format: val => val ? JSON.stringify(val) : '' },
  { name: 'quotaUsed', label: t('Quota Used'), field: 'quotaUsed', format: q => `$${q.toFixed(3)}` },
  { name: 'storageUsed', label: t('Storage Used'), field: 'storageUsed', format: formatBytes },
  { name: 'resetAt', label: t('Reset At'), field: 'resetAt', format: resetAt => new Date(resetAt).toLocaleString() },
  { name: 'createdAt', label: t('Created At'), field: 'id', format: id => idDateString(id) },
]

const route = useRoute()
const query = reactive({
  ownerId: typeof route.query.ownerId === 'string' ? route.query.ownerId : null,
  planId: null as string | null,
})

const { data: rows } = useQuery(() => queries.adminWorkspaces({ ...query }))

const $q = useQuasar()

function updateWorkspace(workspace: Row['workspace']) {
  $q.dialog({
    component: UpdateWorkspaceDialog,
    componentProps: {
      workspace,
    },
  })
}
</script>
