import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import { auth } from './auth/auth'
import { db } from './utils/db'
import { stripe } from './utils/stripe'
import { DEFAULT_PLAN_ID } from 'app/src-shared/utils/config'
import { eq, type InferSelectModel } from 'drizzle-orm'
import { order, workspace } from './schema'
import { paymentProviderSchema, planIntervalSchema } from 'app/src-shared/utils/validators'
import { FRONT_URL } from './utils/config'
import { genId } from 'app/src-shared/utils/id'
import { wxpayCheckout } from './utils/wxpay'

type Workspace = InferSelectModel<typeof workspace>
async function requireCustomerId(ws: Workspace) {
  if (ws.payment?.type === 'stripe') {
    return ws.payment.customerId
  }
  const customer = await stripe.customers.create({
    name: ws.name,
    metadata: { workspaceId: ws.id },
  })
  await db.update(workspace)
    .set({ payment: { type: 'stripe', customerId: customer.id } })
    .where(eq(workspace.id, ws.id))
  return customer.id
}

const successUrl = `${FRONT_URL}/workspace`
const cancelUrl = `${FRONT_URL}/workspace/plans`

const app = new Hono()
  .post('/checkout',
    zValidator('json', z.object({
      provider: paymentProviderSchema,
      workspaceId: z.string(),
      planId: z.string(),
      interval: planIntervalSchema,
    })),
    async c => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers })
      if (!session) return c.json({ error: 'Unauthorized' }, 401)

      const { provider, workspaceId, planId, interval } = c.req.valid('json')
      const workspace = await db.query.workspace.findFirst({
        where: { id: workspaceId, ownerId: session.user.id },
      })
      if (!workspace) return c.json({ error: 'Workspace not found' }, 404)

      const plan = await db.query.plan.findFirst({
        where: { id: planId },
        with: {
          prices: {
            where: { enabled: true, interval, provider },
          },
        },
      })
      if (!plan) return c.json({ error: 'Plan not found' }, 400)

      const price = plan.prices[0]
      if (!price) return c.json({ error: 'Price not found' }, 400)

      if (provider === 'wxpay') {
        if (workspace.planId !== DEFAULT_PLAN_ID && workspace.planId !== planId) {
          return c.json({ error: 'Plan already subscribed' }, 400)
        }
        const orderId = genId()
        const url = await wxpayCheckout({
          type: 'wxpay',
          return_url: successUrl,
          out_trade_no: orderId,
          name: `${plan.name} Plan (${interval})`,
          money: price.amount.toFixed(2),
        })
        await db.insert(order).values({
          id: orderId,
          workspaceId: workspace.id,
          planId: price.planId,
          planInterval: price.interval,
          provider: {
            type: 'wxpay',
          },
          amount: price.amount,
        })
        return c.json({ url })
      } else {
        if (workspace.planId !== DEFAULT_PLAN_ID) {
          return c.json({ error: 'Plan already subscribed' }, 400)
        }
        const promotekitReferral = getCookie(c, 'promotekit_referral')
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer: await requireCustomerId(workspace),
          line_items: [
            {
              price: price.priceId!,
              quantity: 1,
            },
          ],
          metadata: {
            ...(promotekitReferral ? { promotekit_referral: promotekitReferral } : {}),
            workspaceId: workspace.id,
          },
        })
        return c.json({ url: session.url! })
      }
    },
  )
  .post('/createPortalSession',
    zValidator('json', z.object({
      workspaceId: z.string(),
    })),
    async c => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers })
      if (!session) return c.json({ error: 'Unauthorized' }, 401)
      const { workspaceId } = c.req.valid('json')
      const workspace = await db.query.workspace.findFirst({
        where: { id: workspaceId, ownerId: session.user.id },
      })
      if (!workspace) return c.json({ error: 'Workspace not found' }, 404)
      const customerId = await requireCustomerId(workspace)
      const { url } = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${FRONT_URL}/workspace`,
      })
      return c.json({ url })
    },
  )

export default app
