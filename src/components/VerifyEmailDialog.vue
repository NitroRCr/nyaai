<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card style="width: min(90vw, 400px)">
      <q-card-section>
        <div class="text-h6">
          {{ t('Verify Email') }}
        </div>
      </q-card-section>
      <q-card-section pt-0>
        {{ t('We have sent you a verification email. Please open the link in the email to verify your email address.') }}
      </q-card-section>
      <q-card-actions>
        <q-btn
          flat
          color="primary"
          :label="t('Resend')"
          :loading="sending"
          @click="resend"
          no-caps
        />
        <q-space />
        <q-btn
          flat
          color="primary"
          :label="t('I have verified')"
          :loading="signingIn"
          @click="signIn"
          no-caps
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { until } from '@vueuse/core'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { authClient } from 'src/utils/auth-client'
import { t } from 'src/utils/i18n'
import { user } from 'src/utils/zero-session'
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps<{
  email: string
  password: string
}>()

defineEmits([
  ...useDialogPluginComponent.emits,
])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const sending = ref(false)
const signingIn = ref(false)

const $q = useQuasar()
async function resend() {
  sending.value = true

  const { error } = await authClient.sendVerificationEmail({
    email: props.email,
    callbackURL: `${location.origin}/auth/email-verified`,
  })
  sending.value = false
  if (error) {
    console.error(error)
    $q.notify({
      message: t('Failed to send verification email: {0}', error.message),
      color: 'negative',
    })
    return
  }
  $q.notify(t('Verification email sent'))
}
const router = useRouter()
const route = useRoute()
function getRedirect() {
  return route.query.redirect as string || '/'
}
async function signIn() {
  signingIn.value = true

  const { error } = await authClient.signIn.email({
    email: props.email,
    password: props.password,
  })
  signingIn.value = false
  if (error) {
    console.error(error)
    $q.notify({
      message: t('Failed to sign in: {0}', error.message),
      color: 'negative',
    })
    return
  }
  onDialogOK()
  await until(() => user.id).toBeTruthy()
  router.replace(getRedirect())
}
</script>
