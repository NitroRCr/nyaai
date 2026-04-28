import { stripe } from './utils/stripe'
import { STRIPE_WEBHOOK_SECRET } from './utils/config'
import { Hono } from 'hono'
import type Stripe from 'stripe'
import { db } from './utils/db'
import { order, workspace } from './schema'
import { eq, sql } from 'drizzle-orm'
import { DEFAULT_PLAN_ID } from 'app/src-shared/utils/config'
import { addMonths, differenceInMonths, subMonths } from 'date-fns'
import { genId } from 'app/src-shared/utils/id'
import { getSign } from './utils/wxpay'
import { intervalMonths } from 'app/src-shared/utils/values'

async function findWorkspaceByCustomerId(customerId: string) {
  return await db.query.workspace.findFirst({
    where: {
      RAW: t => sql`${t.payment}->>'customerId' = ${customerId}`,
    },
  })
}

async function resetPlan(workspaceId: string) {
  await db.update(workspace)
    .set({ planId: DEFAULT_PLAN_ID, remainingMonths: null })
    .where(eq(workspace.id, workspaceId))
}

function getId(x: { id: string } | string) {
  return typeof x === 'string' ? x : x.id
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.customer) return
  const customerId = getId(invoice.customer)

  const ws = await findWorkspaceByCustomerId(customerId)
  if (!ws) return

  const lineItem = invoice.lines.data.find(item => item.amount > 0)
  if (!lineItem) return
  const stripePrice = lineItem.pricing?.price_details?.price
  if (!stripePrice) return

  const priceId = getId(stripePrice)

  const price = await db.query.planPrice.findFirst({ where: { priceId } })
  if (!price) return

  if (!lineItem.subscription) return
  await db.insert(order).values({
    id: genId(),
    workspaceId: ws.id,
    planId: price.planId,
    planInterval: price.interval,
    provider: {
      type: 'stripe',
      priceId,
      customerId,
      subscriptionId: getId(lineItem.subscription),
      invoiceId: invoice.id,
    },
    amount: invoice.amount_paid / 100,
    completedAt: new Date(),
  })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = getId(subscription.customer)

  const ws = await findWorkspaceByCustomerId(customerId)
  if (!ws) return

  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await resetPlan(ws.id)
  }

  const priceId = subscription.items.data[0].price.id
  const price = await db.query.planPrice.findFirst({ where: { priceId } })
  if (!price) return

  const end = new Date(subscription.items.data[0].current_period_end * 1000)
  const months = differenceInMonths(end, new Date())
  const resetAt = subMonths(end, months)

  const resetQuota = resetAt.getTime() !== ws.resetAt.getTime() ? { quotaUsed: 0 } : {}

  await db.update(workspace)
    .set({
      payment: { type: 'stripe', customerId, subscriptionId: subscription.id },
      planId: price.planId,
      resetAt,
      remainingMonths: months,
      ...resetQuota,
    })
    .where(eq(workspace.id, ws.id))
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getId(subscription.customer)

  const ws = await findWorkspaceByCustomerId(customerId)
  if (!ws) return

  await resetPlan(ws.id)
}

const app = new Hono()
  .post('/stripe', async c => {
    const body = await c.req.raw.text()
    const sig = c.req.header('stripe-signature')

    if (!sig || !STRIPE_WEBHOOK_SECRET) {
      return c.json({ error: 'Missing signature or webhook secret' }, 400)
    }

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return c.json({ error: `Invalid signature: ${(err as Error).message}` }, 400)
    }

    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
    }

    return c.json({ received: true })
  })
  .get('/wxpay', async c => {
    const params = c.req.query()
    if (params['sign'] !== getSign(params)) return c.json({ error: 'Invalid signature' }, 401)
    const orderId = params['out_trade_no']

    return await db.transaction(async tx => {
      const od = await tx.query.order.findFirst({ where: { id: orderId } })
      if (!od) return c.json({ error: 'Order not found' }, 400)

      if (od.completedAt) return c.text('success')

      const ws = await tx.query.workspace.findFirst({ where: { id: od.workspaceId } })
      if (!ws) return c.json({ error: 'Workspace not found' }, 400)

      const date = new Date()
      const months = intervalMonths[od.planInterval]

      if (ws.planId === od.planId) {
        await tx.update(workspace).set({
          payment: { type: 'wxpay' },
          remainingMonths: sql`${workspace.remainingMonths} + ${months}`,
        }).where(eq(workspace.id, ws.id))
      } else {
        await tx.update(workspace).set({
          payment: { type: 'wxpay' },
          planId: od.planId,
          resetAt: addMonths(date, 1),
          remainingMonths: months - 1,
          quotaUsed: 0,
        }).where(eq(workspace.id, ws.id))
      }
      await tx.update(order).set({
        completedAt: date,
      }).where(eq(order.id, orderId))

      return c.text('success')
    })
  })

export default app
