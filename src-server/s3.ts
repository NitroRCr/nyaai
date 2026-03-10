import { Hono } from 'hono'
import { auth } from './auth/auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from './utils/db'
import { and, eq, isNull } from 'drizzle-orm'
import { hashProofStream } from 'app/src-shared/utils/functions'
import * as schema from './schema'
import { randomId } from 'app/src-shared/utils/id'
import { withReadable, withWritable } from './utils/functions'
import { deleteObject, presignedGetObject, putObject } from './utils/s3'

async function getDownloadUrl(id: string, userId: string) {
  const item = await db.query.item.findFirst({
    where: {
      id,
      blobId: { isNotNull: true },
      ...withReadable(userId),
    },
    with: {
      blob: true,
      entity: true,
    },
  })
  if (!item?.blob) return null
  return {
    url: await presignedGetObject(item.blob.id, {
      expires: 1800,
      contentDisposition: `attachment; filename="${encodeURIComponent(item.entity?.name || 'file')}"`,
    }),
    size: item.blob.size,
    sha256: item.blob.sha256,
  }
}

const app = new Hono()
  .put('/items/:id', zValidator('header', z.object({
    'content-length': z.string().transform(Number).default(0),
    'sha-256': z.base64(),
    'sha-256-proof': z.base64(),
  })), async c => {
    const id = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    const req = c.req.raw
    if (!session) return c.json({ error: 'Unauthorized' }, 401)
    const { 'content-length': contentLength, 'sha-256': sha256, 'sha-256-proof': sha256Proof } = c.req.valid('header')

    const resp = await db.transaction(async tx => {
      const item = await db.query.item.findFirst({
        where: {
          id,
          blobId: { isNull: true },
          ...withWritable(session.user.id),
        },
        with: {
          workspace: {
            with: {
              plan: true,
            },
          },
        },
      })
      if (!item?.workspace) return c.json({ error: 'item not found' }, 404)

      const blob = await db.query.blob.findFirst({
        where: {
          sha256,
          sha256Proof,
          refCount: { gte: 1 },
        },
      })

      const size = blob ? blob.size : contentLength

      const { storageUsed, plan } = item.workspace
      if (size > plan!.fileSizeLimit) {
        return c.json({ error: 'File too large' }, 413)
      }
      if (storageUsed + size > plan!.storageLimit) {
        return c.json({ error: 'Storage limit exceeded' }, 403)
      }
      if (blob) {
        await tx.update(schema.item).set({
          blobId: blob.id,
        }).where(eq(schema.item.id, id))
        return c.json({ success: true })
      }
    })

    if (resp) return resp

    if (!req.body) return c.json({ error: 'Upload needed' }, 200)

    const blobId = randomId()
    const [hashStream, s3Stream] = req.body.tee()
    const hasher = new Bun.CryptoHasher('sha256')
    try {
      await Promise.all([
        hashProofStream(hasher, hashStream),
        putObject(blobId, s3Stream, {
          size: contentLength,
          metadata: { 'x-amz-checksum-sha256': sha256 },
        }),
      ])
    } catch (err: any) {
      if (req.signal.aborted) return c.json({ error: 'Client aborted when uploading' }, 400)
      if (err.code === 'BadDigest') return c.json({ error: 'Invalid checksum' }, 400)
      throw err
    }

    if (hasher.digest('base64') !== sha256Proof) {
      await deleteObject(blobId)
      return c.json({ error: 'SHA-256 proof mismatch' }, 400)
    }

    await db.transaction(async tx => {
      await tx.insert(schema.blob).values({
        id: blobId,
        sha256,
        sha256Proof,
        size: contentLength,
        refCount: 0,
      })
      await tx.update(schema.item).set({
        blobId,
      }).where(and(
        eq(schema.item.id, id),
        isNull(schema.item.blobId),
      ))
    })

    return c.json({ success: true })
  })
  .get('/items/:id', async c => {
    const id = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const res = await getDownloadUrl(id, session.user.id)
    if (!res) return c.json({ error: 'Not found' }, 404)
    return c.redirect(res.url)
  })
  .get('/items/:id/url', async c => {
    const id = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const res = await getDownloadUrl(id, session.user.id)
    if (!res) return c.json({ error: 'Not found' }, 404)
    return c.json(res)
  })

export default app
