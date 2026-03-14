import { user } from 'src/utils/zero-session'
import { useRoute, useRouter } from 'vue-router'

export function useRequireLogin() {
  const route = useRoute()
  const router = useRouter()
  if (!user.id) router.replace({ path: '/auth/sign-in', query: { redirect: route.fullPath } })
}
