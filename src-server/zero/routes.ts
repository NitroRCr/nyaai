import { Hono } from 'hono'
import {
  handleMutateRequest,
  handleQueryRequest,
} from '@rocicorp/zero/pg'
import { schema } from 'app/src-shared/schema.gen'
import { auth } from '../auth/auth'
import { mustGetMutator, mustGetQuery } from '@rocicorp/zero'
import { queries } from 'app/src-shared/queries'
import { zdb } from './db'
import { getLocaleFromHeaders } from '../utils/functions'
import type { Context } from 'app/src-shared/utils/types'
import { serverMutators } from './mutators'

async function getCtx(headers: Headers): Promise<Context> {
  const session = await auth.api.getSession({ headers })
  return {
    userId: session?.user.id,
    locale: getLocaleFromHeaders(headers),
    isAdmin: session?.user.role === 'admin',
  }
}

const app = new Hono()

app.post('/mutate', async c => {
  const ctx = await getCtx(c.req.raw.headers)
  if (!ctx.userId) return c.json({ error: 'Unauthorized' }, 401)
  return c.json(await handleMutateRequest(
    zdb,
    transact => transact(async (tx, name, args) => {
      const mutator = mustGetMutator(serverMutators, name)
      return await mutator.fn({ tx, ctx, args })
    }),
    c.req.raw,
  ))
})

app.post('/query', async c => {
  const ctx = await getCtx(c.req.raw.headers)
  return c.json(await handleQueryRequest(
    (name, args) => {
      const query = mustGetQuery(queries, name)
      return query.fn({ ctx, args })
    },
    schema,
    c.req.raw,
  ))
})

export default app
