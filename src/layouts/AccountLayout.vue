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
        @click="uiStateStore.toggleMainDrawer"
      />
      <q-toolbar-title>{{ t('Account') }}</q-toolbar-title>
    </q-toolbar>
  </q-header>
  <q-page-container>
    <q-page
      v-if="user"
      max-w="800px"
      mx-a
      py-2
    >
      <q-list>
        <common-item :label="t('Name')">
          <a-input
            :model-value="user.name"
            @change="updateName"
            dense
            filled
          />
        </common-item>
        <common-item
          :label="t('Avatar')"
          clickable
          @click="pickAvatar"
        >
          <a-avatar :avatar="userAvatar(user)" />
        </common-item>
        <common-item :label="t('Email')">
          {{ user.email }}
        </common-item>
        <common-item :label="t('Created At')">
          {{ new Date(user.createdAt).toLocaleString() }}
        </common-item>
        <common-item
          :label="t('Change Password')"
          clickable
          @click="changePassword"
        >
          <q-icon name="sym_o_chevron_right" />
        </common-item>
      </q-list>
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from 'src/stores/workspace'
import { computed } from 'vue'
import { t } from 'src/utils/i18n'
import { useUiStateStore } from 'src/stores/ui-state'
import CommonItem from 'src/components/CommonItem.vue'
import AInput from 'src/components/AInput'
import { mutate } from 'src/utils/zero-session'
import { mutators } from 'app/src-shared/mutators'
import AAvatar from 'src/components/AAvatar.vue'
import { userAvatar } from 'src/utils/defaults'
import { useQuasar } from 'quasar'
import FileInputDialog from 'src/admin/components/FileInputDialog.vue'
import { cropSquareImage } from 'src/utils/image-process'
import ChangePasswordDialog from 'src/components/ChangePasswordDialog.vue'
import { useRequireLogin } from 'src/composables/require-login'

useRequireLogin()

const uiStateStore = useUiStateStore()
const workspaceStore = useWorkspaceStore()
const user = computed(() => workspaceStore.member?.user)

function updateName(name: string) {
  mutate(mutators.updateUser({ name }))
}
const $q = useQuasar()
function pickAvatar() {
  $q.dialog({
    component: FileInputDialog,
    componentProps: {
      image: true,
    },
  }).onOk(async (file: File) => {
    file = await cropSquareImage(file, 72)
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    mutate(mutators.updateUser({
      image: url,
    }))
  })
}

function changePassword() {
  $q.dialog({
    component: ChangePasswordDialog,
  })
}
</script>
