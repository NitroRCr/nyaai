<template>
  <q-page-container>
    <q-page
      v-if="workspace"
      max-w="800px"
      mx-a
      py-2
    >
      <q-list>
        <common-item :label="t('Name')">
          <a-input
            :model-value="workspace.name"
            @change="updateName"
            :disable="!isAdmin"
            dense
            filled
          />
        </common-item>
        <common-item
          :label="t('Icon')"
          :clickable="isAdmin"
          @click="pickAvatar"
        >
          <a-avatar :avatar="workspaceAvatar(workspace)" />
        </common-item>
        <q-separator spaced />
        <q-item-label header>
          {{ t('Subscription') }}
        </q-item-label>
        <common-item
          :label="t('Current Plan')"
          :to="isOwner ? '/workspace/plans' : undefined"
        >
          {{ workspace.plan?.name }}
        </common-item>
        <common-item
          :label="t('Next Billing Time')"
          v-if="nextBillingTime"
          :caption="nextBillingTime"
        >
          <template v-if="isOwner">
            <q-btn
              v-if="workspace.payment?.type === 'stripe'"
              :label="t('Manage Subscription')"
              @click="gotoPortal"
              :loading="creatingPortalSession"
              no-caps
              unelevated
              bg-pri-c
              text-on-pri-c
            />
            <q-btn
              v-else-if="workspace.payment?.type === 'wxpay'"
              :label="t('Renew')"
              unelevated
              bg-pri-c
              text-on-pri-c
            />
          </template>
        </common-item>
        <common-item :label="t('File storage usage')">
          <span :class="{ 'text-err': workspace.storageUsed >= workspace.plan!.storageLimit }">
            {{ formatBytes(workspace.storageUsed) }} / {{ formatBytes(workspace.plan!.storageLimit) }}
          </span>
        </common-item>
        <common-item
          :label="t('AI quota usage')"
          :caption="t('Next reset time: {0}', new Date(workspace.resetAt).toLocaleString())"
        >
          <span :class="{ 'text-err': workspace.quotaUsed >= workspace.plan!.quotaLimit }">
            ${{ workspace.quotaUsed.toFixed(4) }} / ${{ workspace.plan!.quotaLimit }}
          </span>
        </common-item>
        <q-separator spaced />
        <div
          flex
          items-center
          text-on-sur-var
          px-4
          py-2
        >
          <div>
            {{ t('Members') }} ({{ workspace.members.length }}/{{ workspace.plan?.maxMembers }})
          </div>
          <q-btn
            v-if="isAdmin"
            icon="sym_o_group_add"
            :title="t('Invite Members')"
            @click="createInvitation"
            flat
            dense
            round
            ml-a
          />
        </div>
        <q-item
          v-for="member of workspace.members"
          :key="member.id"
        >
          <q-item-section avatar>
            <a-avatar :avatar="userAvatar(member.user)" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ member.user!.name }}
            </q-item-label>
            <q-item-label caption>
              {{ roleText(member.role) }}
            </q-item-label>
          </q-item-section>
          <q-item-section
            side
            v-if="isAdmin && member.role !== 'owner'"
          >
            <q-btn
              icon="sym_o_more_vert"
              :title="t('Actions')"
              flat
              dense
              round
            >
              <q-menu>
                <q-list>
                  <menu-item
                    icon="sym_o_swap_horiz"
                    :label="t('Change Role')"
                    @click="changeRole(member)"
                  />
                  <menu-item
                    icon="sym_o_person_remove"
                    :label="t('Remove Member')"
                    @click="removeMember(member)"
                    hover:text-err
                  />
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
        <template v-if="workspace.invitations.length">
          <q-separator spaced />
          <div
            flex
            items-center
            text-on-sur-var
            px-4
            py-2
          >
            <div>
              {{ t('My Invitations') }}
            </div>
            <q-btn
              v-if="isAdmin"
              icon="sym_o_add"
              :title="t('Create Invitation')"
              @click="createInvitation"
              flat
              dense
              round
              ml-a
            />
          </div>
          <q-item
            v-for="invitation of workspace.invitations"
            :key="invitation.token"
          >
            <q-item-section>
              <q-item-label>
                {{ maskedInvitationLink(invitation.token) }}
              </q-item-label>
              <q-item-label caption>
                {{ expiresText(invitation.expiresAt) }} / {{ remainingSeatsText(invitation.remainingSeats) }} / {{ t('Role: {0}', roleText(invitation.role)) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div flex>
                <copy-btn
                  :value="invitationLink(invitation.token)"
                  :title="t('Copy Invitation Link')"
                  flat
                  round
                  size="sm"
                />
                <q-btn
                  icon="sym_o_delete"
                  :title="t('Delete Invitation')"
                  @click="deleteInvitation(invitation.token)"
                  flat
                  round
                  size="sm"
                />
              </div>
            </q-item-section>
          </q-item>
        </template>
        <q-separator spaced />
        <q-item>
          <q-item-section>{{ t('Actions') }}</q-item-section>
          <q-item-section side>
            <q-btn
              v-if="isOwner"
              :label="t('Delete Workspace')"
              @click="deleteWorkspace"
              flat
              text-err
              no-caps
            />

            <q-btn
              v-else
              :label="t('Leave Workspace')"
              @click="leaveWorkspace"
              flat
              text-err
              no-caps
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">

import { mutators } from 'app/src-shared/mutators'
import AAvatar from 'src/components/AAvatar.vue'
import { mutate } from 'src/utils/zero-session'
import { useWorkspaceStore } from 'src/stores/workspace'
import { t } from 'src/utils/i18n'
import { computed, ref, toRef } from 'vue'
import { userAvatar, workspaceAvatar } from 'src/utils/defaults'
import MenuItem from 'src/components/MenuItem.vue'
import { copyToClipboard, useQuasar } from 'quasar'
import type { FullMember } from 'app/src-shared/queries'
import CreateInvitationDialog from 'src/components/CreateInvitationDialog.vue'
import { formatBytes, formatTimeBrief, invitationLink, maskedInvitationLink, roleText } from 'src/utils/functions'
import CopyBtn from 'src/components/CopyBtn.vue'
import DeleteWorkspaceDialog from 'src/components/DeleteWorkspaceDialog.vue'
import CommonItem from 'src/components/CommonItem.vue'
import { addMonths } from 'date-fns'
import { client } from 'src/utils/hc'
import PickAvatarDialog from 'src/components/PickAvatarDialog.vue'
import AInput from 'src/components/AInput'

const workspaceStore = useWorkspaceStore()
const workspace = toRef(workspaceStore, 'workspace')

const isAdmin = computed(() => workspaceStore.member && ['owner', 'admin'].includes(workspaceStore.member.role))
const isOwner = computed(() => workspaceStore.member?.role === 'owner')

function updateName(name: string) {
  mutate(mutators.updateWorkspace({
    id: workspaceStore.id!,
    name,
  }))
}

function expiresText(expiresAt: number) {
  const remaining = expiresAt - Date.now()
  if (remaining >= 0) return t('Expires in {0}', formatTimeBrief(remaining))
  else return t('Expired {0} ago', formatTimeBrief(-remaining))
}
function remainingSeatsText(remainingSeats: number) {
  if (remainingSeats > 0) return t('Remaining {p0 seat}', remainingSeats)
  else return t('No seats remaining')
}

const $q = useQuasar()
function changeRole(member: FullMember) {
  $q.dialog({
    title: t('Change Member Role'),
    message: t('Change {0}\'s role to:', member.user!.name),
    options: {
      type: 'radio',
      model: member.role,
      items: [
        { label: t('Admin'), value: 'admin' },
        { label: t('Member'), value: 'member' },
        { label: t('Guest'), value: 'guest' },
      ],
    },
    cancel: true,
  }).onOk(role => {
    mutate(mutators.changeMemberRole({
      id: member.id,
      role,
    }))
  })
}
function removeMember(member: FullMember) {
  $q.dialog({
    title: t('Remove Member'),
    message: t('Are you sure you want to remove {0} from your workspace?', member.user!.name),
    cancel: true,
    ok: {
      label: t('Remove'),
      color: 'negative',
      flat: true,
    },
  }).onOk(() => {
    mutate(mutators.removeMember(member.id))
  })
}
function createInvitation() {
  $q.dialog({
    component: CreateInvitationDialog,
  }).onOk(token => {
    copyToClipboard(invitationLink(token)).then(() => {
      $q.notify(t('Invitation link has been copied to clipboard'))
    })
  })
}
function deleteInvitation(token: string) {
  $q.dialog({
    title: t('Delete Invitation'),
    message: t('Are you sure you want to delete this invitation?'),
    cancel: true,
    ok: t('Delete'),
  }).onOk(() => {
    mutate(mutators.deleteInvitation(token))
  })
}
function leaveWorkspace() {
  $q.dialog({
    title: t('Leave Workspace'),
    message: t('Are you sure you want to leave "{0}"?', workspace.value!.name),
    cancel: true,
    ok: {
      label: t('Leave'),
      color: 'negative',
      flat: true,
    },
  }).onOk(() => {
    mutate(mutators.leaveWorkspace(workspaceStore.id!))
  })
}
function deleteWorkspace() {
  $q.dialog({
    component: DeleteWorkspaceDialog,
    componentProps: {
      workspace: workspaceStore.workspace!,
    },
  })
}

const nextBillingTime = computed(() => {
  const { workspace } = workspaceStore
  if (workspace?.remainingMonths == null) return null
  return addMonths(new Date(workspace.resetAt), workspace.remainingMonths).toLocaleString()
})

const creatingPortalSession = ref(false)
function gotoPortal() {
  creatingPortalSession.value = true
  client.api.payment.createPortalSession.$post({
    json: { workspaceId: workspaceStore.id! },
  }).then(async res => {
    const data = await res.json()
    if ('error' in data) throw new Error(data.error)
    window.open(data.url, '_blank')
  }).catch(err => {
    $q.notify({
      message: t('Failed to create portal session: {0}', err.message),
      color: 'negative',
    })
  }).finally(() => {
    creatingPortalSession.value = false
  })
}

function pickAvatar() {
  $q.dialog({
    component: PickAvatarDialog,
    componentProps: {
      defaultTab: 'icon',
      model: workspaceAvatar(workspaceStore.workspace),
      parentId: workspaceStore.id!,
    },
  }).onOk(avatar => {
    mutate(mutators.updateWorkspace({
      id: workspaceStore.id!,
      avatar,
    }))
  })
}
</script>
