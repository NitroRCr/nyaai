import { Hono } from 'hono'
import { auth } from './auth/auth'
import { SEARXNG_URL } from './utils/config'

const app = new Hono()
  .get('/', async c => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)
    const url = new URL(c.req.url)
    const target = new URL(url.search, SEARXNG_URL)
    target.searchParams.set('format', 'json')
    const resp = await fetch(target, {
      headers: {
        'accept-language': c.req.raw.headers.get('accept-language') ?? '*',
      },
    })
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        'content-type': 'application/json',
      },
    })
  })

export default app
