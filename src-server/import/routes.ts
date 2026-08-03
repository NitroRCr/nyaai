import { Hono } from 'hono'
import { auth } from '../auth/auth'
import { createAiawImportJob, findWritableImportParent, getActiveAiawImportJob, getAiawImportJob, runAiawImportJob } from './aiaw'

const app = new Hono()
  .post('/aiaw', async c => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const form = await c.req.formData()
    const file = form.get('file')
    const parentId = form.get('parentId')
    const folderName = form.get('folderName')
    if (!(file instanceof File) || typeof parentId !== 'string') {
      return c.json({ error: 'File and parentId are required' }, 400)
    }

    const parent = await findWritableImportParent(parentId, session.user.id)
    if (!parent) return c.json({ error: 'Target folder not found' }, 404)

    const created = createAiawImportJob(session.user.id)
    if ('active' in created) {
      return c.json({ error: 'An AIaW import is already running', job: created.active }, 409)
    }

    runAiawImportJob(
      created.job,
      file,
      parent,
      typeof folderName === 'string' && folderName ? folderName : 'AIaW Import',
    )
    return c.json({ job: created.snapshot }, 202)
  })
  .get('/aiaw/active', async c => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)
    return c.json({ job: getActiveAiawImportJob(session.user.id) || null })
  })
  .get('/aiaw/:id', async c => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)
    const job = getAiawImportJob(c.req.param('id'), session.user.id)
    if (!job) return c.json({ error: 'Import job not found' }, 404)
    return c.json({ job })
  })

export default app
