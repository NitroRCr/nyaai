<template>
  <q-form @submit="signUp">
    <q-input
      :label="t('Name')"
      type="text"
      v-model="input.name"
      :rules="[
        val => val.length >= 2 || t('Name must be at least 2 characters long')
      ]"
      filled
    />
    <q-input
      :label="t('Email')"
      type="email"
      v-model="input.email"
      required
      filled
      class="mt-2"
    />
    <set-password-inputs
      v-model="input.password"
      mt-6
      filled
    />
    <policy-links class="mt-2" />
    <q-btn
      :label="t('Sign Up')"
      :loading
      type="submit"
      unelevated
      color="primary"
      mt-4
      w-full
      h="40px"
    />
  </q-form>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { t } from 'src/utils/i18n'
import { authClient } from 'src/utils/auth-client'
import { reactive, ref } from 'vue'
import SetPasswordInputs from './SetPasswordInputs.vue'
import VerifyEmailDialog from './VerifyEmailDialog.vue'
import { useRoute, useRouter } from 'vue-router'
import { until } from '@vueuse/core'
import { user } from 'src/utils/zero-session'
import PolicyLinks from './PolicyLinks.vue'

const input = reactive({
  name: '',
  email: '',
  password: '',
})

const loading = ref(false)
const $q = useQuasar()
const router = useRouter()
const route = useRoute()
function getRedirect() {
  return route.query.redirect as string || '/'
}
async function signUp() {
  loading.value = true
  const { data, error } = await authClient.signUp.email(({
    name: input.name,
    email: input.email,
    password: input.password,
    callbackURL: `${location.origin}/auth/email-verified`,
  }))
  loading.value = false
  if (error) {
    console.error(error)
    $q.notify({
      message: t('Failed to sign up: {0}', error.message),
      color: 'negative',
    })
    return
  }
  if (!data.token) {
    $q.dialog({
      component: VerifyEmailDialog,
      componentProps: {
        email: input.email,
        password: input.password,
      },
    })
    return
  }
  await until(() => user.id).toBeTruthy()
  router.replace(getRedirect())
}
</script>
