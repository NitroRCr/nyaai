import { createAuthMiddleware } from 'better-auth/api'
import { zdb } from '../zero/db'
import { mutators } from 'app/src-shared/mutators'
import { getLocaleFromHeaders } from '../utils/functions'
import { genId, genIds } from 'app/src-shared/utils/id'

export const afterHooks = createAuthMiddleware(async (ctx) => {
  if (ctx.path.startsWith('/sign-up')) {
    if (!ctx.context.newSession) return
    const session = ctx.context.newSession
    await zdb.transaction(async tx => {
      const mutatorCtx = {
        userId: session.user.id,
        locale: getLocaleFromHeaders(ctx.headers),
      }
      const id = genId()
      await mutators.createWorkspace.fn({
        tx,
        ctx: mutatorCtx,
        args: {
          ids: [id, ...genIds(22)],
          name: `${session.user.name}'s workspace`,
        },
      })
      await tx.mutate.userData.insert({
        id: session.user.id,
        lastWorkspaceId: id,
        perfs: {},
        data: {},
      })
    })
  }
})
