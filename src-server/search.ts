import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { auth } from './auth/auth'
import { db } from './utils/db'
import { entity, item, message, page, translationRecord } from './schema'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { entityTypeSchema } from '../src-shared/utils/validators'
import { unionAll } from 'drizzle-orm/pg-core'
import type { SearchResult } from 'app/src-shared/utils/types'

const app = new Hono().post('/',
  zValidator('json', z.object({
    workspaceId: z.string(),
    q: z.string().min(1),
    types: z.array(entityTypeSchema).default(entityTypeSchema.options),
    limit: z.int().min(1).max(100).default(40),
  })),
  async c => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const { workspaceId, q, types, limit } = c.req.valid('json')

    const workspace = await db.query.workspace.findFirst({
      where: {
        id: workspaceId,
        member: {
          userId: session.user.id,
        },
      },
    })

    if (!workspace) return c.json({ error: 'Workspace not found' }, 400)

    // Use websearch_to_tsquery with the same 'mixed' configuration used in schema
    const tsQuery = sql`websearch_to_tsquery('mixed', ${q})`
    const headlineOptions = 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=FALSE, MaxFragments=2, FragmentDelimiter=" ... "'

    const queries: any[] = []

    // 1. Entity (Title search)
    queries.push(
      db.select({
        id: entity.id,
        entityId: sql<string>`${entity.id}`.as('entityId'),
        type: entity.type,
        name: entity.name,
        // Ensure content is casted properly across unions
        content: sql<string | null>`null`.as('content'),
        textToHighlight: sql<string | null>`${entity.name}`.as('textToHighlight'),
        rank: sql<number>`ts_rank("entity"."search", ${tsQuery})`.as('rank'),
      })
        .from(entity)
        .where(
          and(
            eq(entity.rootId, workspaceId),
            inArray(entity.type, types),
            sql`"entity"."search" @@ ${tsQuery}`,
          ),
        ),
    )

    // 2. Message
    const msgTypes = types.filter(t => t === 'chat' || t === 'channel')
    if (msgTypes.length > 0) {
      queries.push(
        db.select({
          id: message.id,
          entityId: sql<string>`${message.entityId}`.as('entityId'),
          type: entity.type,
          name: entity.name,
          content: sql<string | null>`${message.text}`.as('content'),
          textToHighlight: sql<string | null>`${message.text}`.as('textToHighlight'),
          rank: sql<number>`ts_rank("message"."search", ${tsQuery})`.as('rank'),
        })
          .from(message)
          .innerJoin(entity, and(eq(message.entityId, entity.id), eq(message.rootId, entity.rootId)))
          .where(
            and(
              eq(message.rootId, workspaceId),
              inArray(entity.type, msgTypes),
              sql`"message"."search" @@ ${tsQuery}`,
            ),
          ),
      )
    }

    // 3. Page
    if (types.includes('page')) {
      queries.push(
        db.select({
          id: page.id,
          entityId: sql<string>`${page.id}`.as('entityId'),
          type: entity.type,
          name: entity.name,
          content: sql<string | null>`${page.text}`.as('content'),
          textToHighlight: sql<string | null>`${page.text}`.as('textToHighlight'),
          rank: sql<number>`ts_rank("page"."search", ${tsQuery})`.as('rank'),
        })
          .from(page)
          .innerJoin(entity, and(eq(page.id, entity.id), eq(page.rootId, entity.rootId)))
          .where(
            and(
              eq(page.rootId, workspaceId),
              sql`"page"."search" @@ ${tsQuery}`,
            ),
          ),
      )
    }

    // 4. TranslationRecord
    if (types.includes('translation')) {
      queries.push(
        db.select({
          id: translationRecord.id,
          entityId: sql<string>`${translationRecord.entityId}`.as('entityId'),
          type: entity.type,
          name: entity.name,
          content: sql<string | null>`coalesce("translationRecord"."input", '') || ' ' || coalesce("translationRecord"."output", '')`.as('content'),
          textToHighlight: sql<string | null>`coalesce("translationRecord"."input", '') || ' ' || coalesce("translationRecord"."output", '')`.as('textToHighlight'),
          rank: sql<number>`ts_rank("translationRecord"."search", ${tsQuery})`.as('rank'),
        })
          .from(translationRecord)
          .innerJoin(entity, and(eq(translationRecord.entityId, entity.id), eq(translationRecord.rootId, entity.rootId)))
          .where(
            and(
              eq(translationRecord.rootId, workspaceId),
              sql`"translationRecord"."search" @@ ${tsQuery}`,
            ),
          ),
      )
    }

    // 5. Item
    if (types.includes('item')) {
      queries.push(
        db.select({
          id: item.id,
          entityId: sql<string>`${item.id}`.as('entityId'),
          type: entity.type,
          name: entity.name,
          content: sql<string | null>`${item.text}`.as('content'),
          textToHighlight: sql<string | null>`${item.text}`.as('textToHighlight'),
          rank: sql<number>`ts_rank("item"."search", ${tsQuery})`.as('rank'),
        })
          .from(item)
          .innerJoin(entity, and(eq(item.id, entity.id), eq(item.rootId, entity.rootId)))
          .where(
            and(
              eq(item.rootId, workspaceId),
              sql`"item"."search" @@ ${tsQuery}`,
            ),
          ),
      )
    }

    if (queries.length === 0) return c.json([])

    const firstQuery = queries[0]
    const restQueries = queries.slice(1)

    let unionQ: any = firstQuery
    if (restQueries.length > 0) {
      // @ts-expect-error Drizzle expects discrete arguments
      unionQ = unionAll(firstQuery, ...restQueries)
    }

    const finalQuery = db.select({
      id: sql<string>`"id"`,
      entityId: sql<string>`"entityId"`,
      type: sql<string>`"type"`,
      name: sql<string>`"name"`,
      content: sql<string | null>`"content"`,
      highlighted: sql<string | null>`ts_headline('mixed', "textToHighlight", ${tsQuery}, ${headlineOptions}) as "highlighted"`,
      rank: sql<number>`"rank"`,
    })
      .from(unionQ.as('union_q'))
      .orderBy(desc(sql`rank`))
      .limit(limit)

    const results = await finalQuery
    return c.json(results.map(r => {
      const words = new Set<string>()
      r.highlighted?.matchAll(/<mark>(.*?)<\/mark>/gi).forEach(m => words.add(m[1]))
      return {
        id: r.id,
        entityId: r.entityId,
        type: r.type,
        name: r.name,
        content: r.content,
        words: Array.from(words),
        rank: r.rank,
      }
    }) as SearchResult[])
  },
)

export default app
