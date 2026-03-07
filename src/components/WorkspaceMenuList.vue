<template>
  <q-list>
    <workspace-item
      v-if="workspace"
      to="/workspace"
      :workspace
      :members="workspace.members"
      :plan="workspace.plan"
    />
    <q-separator />
    <div
      flex
      text-on-sur-var
      items-center
      py-2
      pl-4
      pr-1
    >
      <div>
        {{ t('Workspaces') }}
      </div>
      <q-btn
        icon="sym_o_add"
        :title="t('Add Workspace')"
        flat
        round
        size="sm"
        ml-a
      >
        <q-menu>
          <q-list>
            <menu-item
              :label="t('Create workspace')"
              icon="sym_o_add"
              @click="createWorkspace"
            />
            <menu-item
              :label="t('Join workspace')"
              icon="sym_o_join"
              @click="joinWorkspace"
            />
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <dense-item
      v-for="w in workspaces"
      :key="w.id"
      :avatar="workspaceAvatar(workspace)"
      :label="w.name"
      :active="w.id === workspaceStore.id"
      clickable
      @click="workspaceStore.switchWorkspace(w.id)"
      v-close-popup
    />
    <q-separator spaced />
    <menu-item
      :label="t('Account')"
      icon="sym_o_account_circle"
      to="/account"
    />
    <menu-item
      :label="t('Sign Out')"
      icon="sym_o_logout"
      @click="signOut"
      hover:text-err
    />
  </q-list>
</template>

<script setup lang="ts">
import { queries } from 'app/src-shared/queries'
import { useQuery } from 'src/composables/zero/query'
import DenseItem from './DenseItem.vue'
import { workspaceAvatar } from 'src/utils/defaults'
import { useWorkspaceStore } from 'src/stores/workspace'
import { t } from 'src/utils/i18n'
import { useQuasar } from 'quasar'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import { genId, genIds } from 'app/src-shared/utils/id'
import MenuItem from './MenuItem.vue'
import { toRef } from 'vue'
import { useRouter } from 'vue-router'
import WorkspaceItem from './WorkspaceItem.vue'
import { authClient } from 'src/utils/auth-client'

const workspaceStore = useWorkspaceStore()
const workspace = toRef(workspaceStore, 'workspace')

const { data: workspaces } = useQuery(queries.workspaces())

const $q = useQuasar()
function createWorkspace() {
  $q.dialog({
    title: t('Create Workspace'),
    prompt: {
      model: '',
      label: t('Name'),
    },
    cancel: true,
    ok: t('Create'),
  }).onOk(async name => {
    const id = genId()
    await mutate(mutators.createWorkspace({
      ids: [id, ...genIds(20)],
      name,
    })).client
    workspaceStore.switchWorkspace(id)
  })
}
const router = useRouter()
function joinWorkspace() {
  $q.dialog({
    title: t('Join Workspace'),
    prompt: {
      model: '',
      label: t('Invitation Link'),
    },
    cancel: true,
  }).onOk((link: string) => {
    const token = link.match(/\/invitations\/(.+)/)?.[1]
    token && router.push(`/invitations/${token}`)
  })
}

function signOut() {
  $q.dialog({
    title: t('Sign Out'),
    message: t('Are you sure you want to sign out?'),
    cancel: true,
    ok: {
      label: t('Sign Out'),
      color: 'negative',
      flat: true,
    },
  }).onOk(() => {
    authClient.signOut()
    workspaceStore.id = null
    router.push('/auth/sign-in')
  })
}
</script>
