import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { estimateTokenCount } from 'tokenx'
import { db } from './utils/db'
import type * as schema from './schema'
import { usage, workspace } from './schema'
import type { InferSelectModel } from 'drizzle-orm'
import { eq, sql } from 'drizzle-orm'
import { PUBLIC_ROOT_ID } from 'app/src-shared/utils/config'
import { OPENAI_API_KEY, OPENAI_BASE_URL } from './utils/config'
import { auth } from './auth/auth'
import { checkRateLimit } from './utils/rate-limiter'
import { genId } from 'app/src-shared/utils/id'
import { getGlobalSettings } from './utils/settings'

const app = new Hono()

const messagesSchema = z.array(z.looseObject({
  content: z.union([
    z.string(),
    z.array(z.looseObject({
      text: z.string().optional(),
    })),
  ]),
})).min(1)

function messagesText(messages: z.infer<typeof messagesSchema>) {
  return messages.map(m =>
    typeof m.content === 'string'
      ? m.content
      : m.content.map(c => c.text ?? '').join('\n'),
  ).join('\n')
}

async function logUsage({ workspaceId, userId, model, inputTokens, outputTokens }: {
  workspaceId: string
  userId: string
  model: InferSelectModel<typeof schema.model>
  inputTokens: number
  outputTokens: number
}) {
  let { inputPrice, outputPrice } = model
  inputPrice ??= 0
  outputPrice ??= 0
  const cost = inputPrice * inputTokens / 1e6 + outputPrice * outputTokens / 1e6
  await db.insert(usage).values({
    id: genId(),
    workspaceId,
    userId,
    modelName: model.name,
    cost,
    details: `inputTokens: ${inputTokens}, outputTokens: ${outputTokens}`,
  })
  await db.update(workspace).set({
    quotaUsed: sql`${workspace.quotaUsed} + ${cost}`,
  }).where(eq(workspace.id, workspaceId))
}

function fetchUpstream(body: object) {
  return fetch(`${OPENAI_BASE_URL!}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY!}`,
    },
    body: JSON.stringify(body),
  })
}

app.post('/chat/completions',
  zValidator('json', z.looseObject({
    model: z.string(),
    stream: z.boolean().optional(),
    stream_options: z.object({
      include_usage: z.boolean().optional(),
    }).optional(),
    messages: messagesSchema,
  })),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.header() })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const body = c.req.valid('json')

    const { model: modelName, stream, messages } = body

    const model = await db.query.model.findFirst({
      where: {
        entityId: PUBLIC_ROOT_ID,
        name: modelName,
      },
    })

    if (!model) return c.json({ error: 'Model not found' }, 400)

    const isFreeModel = !model.inputPrice && !model.outputPrice

    if (isFreeModel) {
      const { freeModelReqLimit, freeModelLimitWindow } = await getGlobalSettings()
      const { allowed, resetAt } = checkRateLimit(
        `free-model-${session.user.id}`,
        freeModelReqLimit,
        freeModelLimitWindow,
      )
      if (!allowed) {
        const resetIn = Math.ceil((resetAt - Date.now()) / 1000)
        console.warn(`User ${session.user.id} has exceeded the free model rate limit`)
        return c.json({ error: `Rate limit exceeded. Reset in ${resetIn}s` }, 429)
      }
      return await fetchUpstream(body)
    }

    const workspaceId = c.req.header('Workspace-Id')
    if (!workspaceId) return c.json({ error: 'workspaceId not specified' }, 400)
    const workspace = await db.query.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          userId: session.user.id,
          role: {
            in: ['owner', 'admin', 'member'],
          },
        },
      },
      with: {
        plan: true,
      },
    })

    if (!workspace) return c.json({ error: 'Workspace not found' }, 400)

    if (workspace.quotaUsed >= workspace.plan!.quotaLimit) return c.json({ error: 'Quota exceeded' }, 403)

    if (stream) {
      body.stream_options ??= {}
      body.stream_options.include_usage = true
    }

    const upstreamResponse = await fetchUpstream(body)

    if (!upstreamResponse.ok) return upstreamResponse

    if (!stream) {
      const data = await upstreamResponse.json()
      logUsage({
        workspaceId,
        userId: session.user.id,
        model,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      })
      return c.json(data)
    }

    if (!upstreamResponse.body) return c.text('No stream', 500)

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const reader = upstreamResponse.body.getReader()
    const decoder = new TextDecoder()

    let output = ''
    let usage: any = null
    let buffer = ''

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            await writer.close()
            break
          }

          await writer.write(value)

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine.startsWith('data: ')) continue

            const jsonStr = trimmedLine.slice(6) // remove 'data: '
            if (jsonStr === '[DONE]') continue

            try {
              const data = JSON.parse(jsonStr)
              if (data.usage) usage = data.usage
              const contentDelta = data.choices?.[0]?.delta?.content
              if (contentDelta) output += contentDelta
            } catch {}
          }
        }
      } catch (err) {
        await writer.abort(err).catch()
      } finally {
        if (usage) {
          await logUsage({
            workspaceId,
            userId: session.user.id,
            model,
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
          })
        } else {
          await logUsage({
            workspaceId,
            userId: session.user.id,
            model,
            inputTokens: estimateTokenCount(messagesText(messages)),
            outputTokens: estimateTokenCount(output),
          })
        }
      }
    }

    processStream()

    return new Response(readable, {
      headers: upstreamResponse.headers,
    })
  })

export default app
