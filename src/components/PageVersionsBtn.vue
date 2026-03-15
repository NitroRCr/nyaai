<template>
  <q-btn
    v-if="patches.length"
    icon="sym_o_history"
    :title="t('Versions')"
  >
    <q-menu>
      <q-list>
        <q-item-label
          header
          py-2
        >
          {{ t('Versions') }}
        </q-item-label>
        <dense-item
          v-for="patch of patches.slice().reverse()"
          :key="patch.id"
          :label="idDateString(patch.id)"
          :avatar="userAvatar(patch.user)"
          :caption="patch.user && t('Edited by {0}', patch.user.name)"
          clickable
          @click="viewVersion(patch.id)"
        />
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { t } from 'src/utils/i18n'
import DenseItem from './DenseItem.vue'
import type { FullPage } from 'app/src-shared/queries'
import { idDateString } from 'app/src-shared/utils/id'
import { userAvatar } from 'src/utils/defaults'
import { useQuasar } from 'quasar'
import PageVersionDialog from './PageVersionDialog.vue'

const props = defineProps<{
  patches: FullPage['patches']
}>()

const emit = defineEmits<{
  restore: [any]
}>()

const $q = useQuasar()
function viewVersion(id: string) {
  $q.dialog({
    component: PageVersionDialog,
    componentProps: {
      patches: props.patches.slice(0, props.patches.findIndex(p => p.id === id) + 1),
    },
  }).onOk(doc => emit('restore', doc))
}
</script>
