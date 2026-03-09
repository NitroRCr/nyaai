import { Zero } from '@rocicorp/zero'
import { schema } from 'app/src-shared/schema.gen'
import { session } from 'src/utils/auth-client'
import { ref, watch } from 'vue'
import { mutators } from 'app/src-shared/mutators'
import { locale, t } from 'src/utils/i18n'
import { ZERO_CACHE_URL } from 'src/utils/config'
import { localReactive } from 'src/composables/local-reactive'
import type { Context } from 'app/src-shared/utils/types'
import { Notify } from 'quasar'

export const user = localReactive('auth-user-cache', {
  id: undefined as string | undefined,
})

function createZero() {
  const context: Context = {
    locale,
    userId: user.id,
    isAdmin: true,
  }
  return new Zero({
    userID: user.id ?? 'anon',
    cacheURL: ZERO_CACHE_URL,
    schema,
    mutators,
    context,
  })
}

export let z = createZero()

export function mutate(...params: Parameters<typeof z.mutate>) {
  const res = z.mutate(...params)
  return {
    ...res,
    client: res.client.then(r => {
      if (r.type === 'error') {
        Notify.create({
          message: t('Mutation failed: {0}', r.error.message),
          color: 'negative',
        })
        throw new Error(r.error.message)
      }
    }),
  }
}
export const zRef = ref(z)
export const connectionState = ref(z.connection.state.current)

watch(session, s => {
  if (s.isPending || s.error) return
  const userId = s.data?.user.id
  if (userId === user.id) return
  user.id = userId
  z.close()
  z = zRef.value = createZero()
  z.connection.state.subscribe(state => {
    connectionState.value = state
  })
}, { immediate: true })
