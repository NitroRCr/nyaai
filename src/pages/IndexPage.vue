<template>
  <welcome-wrapper>
    <q-card
      flat
      bg-sur
      style="width: min(100%, 500px)"
    >
      <q-card-section>
        <div class="text-h5">
          {{ workspaceStore.workspace?.name }}
        </div>
      </q-card-section>
      <q-card-section px-2>
        <navigation-panel />
      </q-card-section>
    </q-card>
  </welcome-wrapper>
</template>
<script setup lang="ts">
import WelcomeWrapper from './WelcomeWrapper.vue'
import { useRouter } from 'vue-router'
import NavigationPanel from 'src/components/NavigationPanel.vue'
import { useWorkspaceStore } from 'src/stores/workspace'
import { useUserDataStore } from 'src/stores/user-data'
import { until } from '@vueuse/core'
import { useRequireLogin } from 'src/composables/require-login'

useRequireLogin()

const router = useRouter()
const userDataStore = useUserDataStore()

until(() => userDataStore.data).toBeTruthy().then(data => {
  if (!data.welcomed) {
    router.replace('/welcome')
    userDataStore.updateData({
      welcomed: [],
    })
  }
})

const workspaceStore = useWorkspaceStore()
</script>
