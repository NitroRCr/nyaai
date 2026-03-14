<template>
  <q-page-container>
    <q-page
      flex="~ col"
      justify-center
      items-center
    >
      <div v-if="invitation">
        <div text="center xl">
          {{ t('{0} invites you to join:', invitation.inviter?.name) }}
        </div>
        <workspace-item
          :workspace="invitation.workspace!"
          mt-2
        />
        <q-btn
          color="primary"
          :label="valid ? t('Join as {0}', roleText(invitation.role)) : t('Invitation has expired')"
          @click="join"
          unelevated
          no-caps
          class="w-full"
          :disable="!valid"
          mt-4
        />
        <div h="100px" />
      </div>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { mutators } from 'app/src-shared/mutators'
import { queries } from 'app/src-shared/queries'
import { genId } from 'app/src-shared/utils/id'
import { useQuasar } from 'quasar'
import WorkspaceItem from 'src/components/WorkspaceItem.vue'
import { useQuery } from 'src/composables/zero/query'
import { mutate } from 'src/utils/zero-session'
import { roleText } from 'src/utils/functions'
import { t } from 'src/utils/i18n'
import { computed, ref } from 'vue'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useRouter } from 'vue-router'
import { useRequireLogin } from 'src/composables/require-login'

useRequireLogin()

const props = defineProps<{
  token: string
}>()

const { data: invitation } = useQuery(() => queries.fullInvitation(props.token))

const valid = computed(() => {
  if (!invitation.value) return false
  if (invitation.value.expiresAt < Date.now()) return false
  if (invitation.value.remainingSeats <= 0) return false
  return true
})

const loading = ref(false)
const $q = useQuasar()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
function join() {
  loading.value = true
  mutate(mutators.joinWorkspace({
    memberId: genId(),
    invitationToken: props.token,
  })).server.then(() => {
    workspaceStore.switchWorkspace(invitation.value!.workspaceId)
    router.push('/')
  }).catch(err => {
    console.error(err)
    $q.notify({
      message: t('Failed to join workspace: {0}', err.message),
      color: 'negative',
    })
  }).finally(() => {
    loading.value = false
  })
}
</script>
