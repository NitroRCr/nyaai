<template>
  <div>
    <q-form @submit="signIn">
      <q-input
        :label="t('Email')"
        type="email"
        v-model="input.email"
        required
        filled
      />
      <q-input
        :label="t('Password')"
        type="password"
        v-model="input.password"
        required
        filled
        class="mt-4"
      />
      <policy-links class="mt-4" />
      <q-btn
        :label="t('Sign In')"
        :loading
        type="submit"
        unelevated
        color="primary"
        mt-4
        w-full
        h="40px"
      />
    </q-form>
    <div
      mt-2
      flex
    >
      <q-btn
        :label="t('Sign up')"
        to="/auth/sign-up"
        flat
        dense
        color="primary"
      />
      <q-btn
        :label="t('Forgot password')"
        flat
        dense
        color="primary"
        ml-a
        @click="forgotPassword"
      />
    </div>
    <q-separator
      v-if="oauthProviders?.length"
      spaced
    />
    <q-btn
      v-if="oauthProviders?.includes('google')"
      @click="signInWith('google')"
      w-full
      unelevated
      bg-pri-c
      text-on-pri-c
      no-caps
      mt-3
    >
      <a-avatar
        :avatar="{ type: 'svg', name: 'google-c'}"
        size="32px"
      />
      <span ml-2>{{ t('Continue with Google') }}</span>
    </q-btn>
    <q-btn
      v-if="oauthProviders?.includes('github')"
      @click="signInWith('github')"
      w-full
      unelevated
      bg-pri-c
      text-on-pri-c
      mt-3
      no-caps
    >
      <a-avatar
        :avatar="{ type: 'svg', name: 'github'}"
        size="32px"
      />
      <span ml-2>{{ t('Continue with GitHub') }}</span>
    </q-btn>
  </div>
</template>

<script setup lang="ts">

import { useQuasar } from 'quasar'
import { t } from 'src/utils/i18n'
import { authClient } from 'src/utils/auth-client'
import { computed, reactive, ref } from 'vue'
import AAvatar from 'src/components/AAvatar.vue'
import ForgotPasswordDialog from './ForgotPasswordDialog.vue'
import VerifyEmailDialog from './VerifyEmailDialog.vue'
import { useRoute, useRouter } from 'vue-router'
import { user } from 'src/utils/zero-session'
import { until } from '@vueuse/core'
import { useGlobalSettingsStore } from 'src/stores/global-settings'
import PolicyLinks from './PolicyLinks.vue'

const input = reactive({
  email: '',
  password: '',
})

const globalSettingsStore = useGlobalSettingsStore()
const oauthProviders = computed(() => globalSettingsStore.settings?.oauthProviders)

const loading = ref(false)
const $q = useQuasar()
const router = useRouter()
const route = useRoute()
function getRedirect() {
  return route.query.redirect as string || '/'
}
async function signIn() {
  loading.value = true
  const { error } = await authClient.signIn.email(({
    email: input.email,
    password: input.password,
  }))
  loading.value = false
  if (error) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      $q.dialog({
        component: VerifyEmailDialog,
        componentProps: {
          email: input.email,
          password: input.password,
        },
        persistent: true,
      })
    } else {
      console.error(error)
      $q.notify({
        message: t('Failed to sign in: {0}', error.message),
        color: 'negative',
      })
    }
    return
  }
  await until(() => user.id).toBeTruthy()
  router.replace(getRedirect())
}

function signInWith(provider: string) {
  authClient.signIn.social({
    provider,
    callbackURL: location.origin + getRedirect(),
  })
}

function forgotPassword() {
  $q.dialog({
    component: ForgotPasswordDialog,
  })
}
</script>
