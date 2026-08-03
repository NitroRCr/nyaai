import { Hono } from 'hono'
import { logger } from 'hono/logger'
import auth from './auth/routes'
import zero from './zero/routes'
import s3 from './s3'
import ai from './ai'
import { seed } from './utils/seed'
import admin from './admin'
import payment from './payment'
import searxng from './searxng'
import webhooks from './webhooks'
import search from './search'
import importRoutes from './import/routes'
import { initJobs } from './jobs'
import { sizeBytes } from 'app/src-shared/utils/functions'
import { log } from './utils/functions'

seed()
initJobs()

export const app = new Hono().basePath('/api')
  .use(logger(log))
  .route('/auth', auth)
  .route('/zero', zero)
  .route('/s3', s3)
  .route('/v1', ai)
  .route('/admin', admin)
  .route('/payment', payment)
  .route('/webhooks', webhooks)
  .route('/searxng', searxng)
  .route('/search', search)
  .route('/import', importRoutes)

export default {
  fetch: app.fetch,
  maxRequestBodySize: sizeBytes('5G'),
  idleTimeout: 0,
}

export type AppType = typeof app
