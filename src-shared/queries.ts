import { z } from 'zod'
import type { DefaultSchema, Query, QueryResultType, Row } from '@rocicorp/zero'
import { defineQueries, defineQuery } from '@rocicorp/zero'
import { zql } from './schema.gen'
import { assertAuthorized, withMember, withReadable } from './table-permission'
import type { EntityListOptions } from './utils/validators'
import { entityListOptionsSchema, entityStartSchema, entityTypeSchema } from './utils/validators'
import { PUBLIC_ROOT_ID } from './utils/config'

type EntityQuery = Query<'entity', DefaultSchema, any>
function withParent(q: EntityQuery, depth: number) {
  if (depth) q = q.related('parent', q => withParent(q, depth - 1))
  return q
}
function withChildren(q: EntityQuery, depth: number, refine: (q: EntityQuery) => EntityQuery = q => q) {
  if (depth) q = q.related('children', q => withChildren(refine(q), depth - 1, refine))
  return q
}
function fullMessage(q: Query<'message', DefaultSchema>) {
  return q
    .related('toolCalls')
    .related('assistant', q => q.related('entity'))
    .related('user')
    .related('entities', q => q.related('item'))
}
function fullChannel(q: Query<'channel', DefaultSchema>, userId?: string) {
  if (userId) {
    q = q
      .related('message', q => q
        .where('type', 'channel:draft')
        .where('userId', userId)
        .related('entities', q => q.related('item')),
      )
  }
  return q
    .related('messages', q => fullMessage(q)
      .where('type', 'IN', ['chat:assistant', 'channel:user'])
      .orderBy('sentAt', 'desc')
      .orderBy('id', 'desc')
      .limit(20),
    ) as Query<'channel', DefaultSchema, Row['channel'] & {
      message?: FullMessage
      messages: FullMessage[]
    }>
}
function filterEntities(q: EntityQuery, { type, hidden, orderBy }: EntityListOptions) {
  if (type) q = q.where('type', type)
  if (hidden != null) q = q.where('hidden', hidden)
  return q
    .orderBy('sortPriority', 'desc')
    .orderBy(...orderBy)
}

export const queries = defineQueries({
  searchWithRecords: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.search
          .where('id', id)
          .related('records'),
        ctx.userId,
      ).one()
    },
  ),
  recentSearches: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.search
          .where('rootId', workspaceId)
          .related('records')
          .orderBy('id', 'desc')
          .limit(20),
        ctx.userId,
      )
    },
  ),
  searchRecord: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.searchRecord.where('id', id),
        ctx.userId,
      ).one()
    },
  ),
  fullChat: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.chat.where('id', id).related('messages', fullMessage),
        ctx.userId,
      ).one()
    },
  ),
  recentChats: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.chat
          .where('rootId', workspaceId)
          .related('messages', fullMessage)
          .orderBy('id', 'desc').limit(20),
        ctx.userId,
      )
    },
  ),
  fullChannel: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        fullChannel(zql.channel, ctx.userId).where('id', id),
        ctx.userId,
      ).one()
    },
  ),
  recentChannels: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        fullChannel(zql.channel, ctx.userId)
          .where('rootId', workspaceId)
          .orderBy('id', 'desc')
          .limit(20),
        ctx.userId,
      )
    },
  ),
  channelMessages: defineQuery(
    z.object({
      id: z.string(),
      start: z.object({
        sentAt: z.number(),
        id: z.string(),
      }).nullish(),
      limit: z.number().default(40),
    }),
    ({ ctx, args: { id, start, limit } }) => {
      let q = fullMessage(zql.message)
        .where('entityId', id)
        .where('type', 'IN', ['chat:assistant', 'channel:user'])
        .orderBy('sentAt', 'desc')
        .orderBy('id', 'desc')
        .limit(limit)
      if (start) q = q.start(start)
      return withReadable(q, ctx.userId)
    },
  ),
  entity: defineQuery(
    z.object({
      id: z.string(),
      parent: z.object({
        depth: z.int(),
      }).nullish(),
      children: z.object({
        depth: z.int(),
        limit: z.int().default(40),
        start: entityStartSchema.nullish(),
        ...entityListOptionsSchema.shape,
      }).nullish(),
    }),
    ({ ctx, args: { id, parent, children } }) => {
      let q = zql.entity.where('id', id)
      if (parent) q = withParent(q, parent.depth)
      if (children) {
        q = withChildren(q, children.depth, q => {
          q = filterEntities(q, children)
          if (children.start) q = q.start(children.start)
          return q.limit(children.limit)
        })
      }
      return withReadable(q as Query<'entity', DefaultSchema, FullEntity>, ctx.userId).one()
    },
  ),
  shortcuts: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(zql.shortcut.where('rootId', workspaceId), ctx.userId)
    },
  ),
  fullAssistant: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.assistant
          .where('id', id)
          .related('entity'),
        ctx.userId,
      ).one()
    },
  ),
  assistants: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.assistant
          .where('rootId', workspaceId)
          .related('entity'),
        ctx.userId,
      )
    },
  ),
  fullModel: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.model
          .where('id', id)
          .related('provider'),
        ctx.userId,
      ).one()
    },
  ),
  fullProvider: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.provider
          .where('id', id)
          .related('entity')
          .related('models'),
        ctx.userId,
      ).one()
    },
  ),
  models: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.model.where('rootId', workspaceId).orderBy('sortPriority', 'desc'),
        ctx.userId,
      )
    },
  ),
  fullPage: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.page
          .where('id', id)
          .related('entity')
          .related('patches', q => q.related('user')),
        ctx.userId,
      ).one()
    },
  ),
  recentPages: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.page
          .where('rootId', workspaceId)
          .related('entity')
          .related('patches')
          .orderBy('id', 'desc')
          .limit(20),
        ctx.userId,
      )
    },
  ),
  fullTranslation: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.translation.where('id', id).related('records'),
        ctx.userId,
      ).one()
    },
  ),
  recentTranslations: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.translation.where('rootId', workspaceId).related('records').orderBy('id', 'desc').limit(20),
        ctx.userId,
      )
    },
  ),
  recentItems: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.item
          .where('rootId', workspaceId)
          .related('blob')
          .orderBy('id', 'desc')
          .limit(20),
        ctx.userId,
      )
    },
  ),
  mcpPlugins: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.mcpPlugin
          .where('rootId', workspaceId)
          .where('enabled', true)
          .related('entity'),
        ctx.userId,
      )
    },
  ),
  mcpPlugin: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.mcpPlugin.where('id', id),
        ctx.userId,
      ).one()
    },
  ),
  fullItem: defineQuery(
    z.string(),
    ({ ctx, args: id }) => {
      return withReadable(
        zql.item.where('id', id).related('blob'),
        ctx.userId,
      ).one()
    },
  ),
  searchEntities: defineQuery(
    z.object({
      workspaceId: z.string(),
      query: z.string(),
      type: entityTypeSchema.nullish(),
      limit: z.number().default(20),
    }),
    ({ ctx, args: { workspaceId, query, type, limit } }) => {
      let q = zql.entity
        .where('name', 'ILIKE', `%${query}%`)
        .where('rootId', workspaceId)
        .orderBy('id', 'desc')
        .limit(limit)
      if (type) q = q.where('type', type)
      return withReadable(q, ctx.userId)
    },
  ),
  publishedEntities: defineQuery(
    z.string(),
    ({ ctx, args: workspaceId }) => {
      return withReadable(
        zql.entity
          .where('rootId', workspaceId)
          .where('pubRoot', 'IS NOT', null)
          .orderBy('id', 'desc'),
        ctx.userId,
      )
    },
  ),
  fullWorkspace: defineQuery(
    z.string(),
    ({ ctx: { userId }, args: workspaceId }) => {
      assertAuthorized(userId)
      return withMember(zql.workspace, userId)
        .where('id', workspaceId)
        .related('member', q => q.where('userId', userId).related('user'))
        .related('members', q => q.related('user'))
        .related('plan')
        .related('invitations', q => q.where('inviterId', userId).orderBy('expiresAt', 'desc'))
        .one()
    },
  ),
  userData: defineQuery(
    z.undefined(),
    ({ ctx }) => {
      assertAuthorized(ctx.userId)
      return zql.userData.where('id', ctx.userId).one()
    },
  ),
  fullInvitation: defineQuery(
    z.string(),
    ({ args: token }) => {
      return zql.workspaceInvitation
        .where('token', token)
        .related('workspace')
        .related('inviter')
        .one()
    },
  ),
  workspaces: defineQuery(
    z.undefined(),
    ({ ctx: { userId } }) => {
      assertAuthorized(userId)
      return withMember(zql.workspace, userId)
    },
  ),
  listTrash: defineQuery(
    z.object({
      workspaceId: z.string(),
      start: entityStartSchema.nullish(),
      limit: z.number().default(40),
      ...entityListOptionsSchema.shape,
    }),
    ({ ctx: { userId }, args: { workspaceId, start, limit, ...listOptions } }) => {
      assertAuthorized(userId)
      let q = zql.entity.whereExists('trashWorkspace', q =>
        withMember(q.where('id', workspaceId), userId),
      )
      q = filterEntities(q, listOptions)
      if (start) q = q.start(start)
      return q.limit(limit)
    },
  ),
  plans: defineQuery(z.undefined(), () => zql.plan.related('prices', q => q.where('enabled', true))),
  publicModels: defineQuery(z.undefined(), () => zql.model.where('entityId', PUBLIC_ROOT_ID).orderBy('sortPriority', 'desc')),
  adminWorkspaces: defineQuery(
    z.object({
      ownerId: z.string().nullish(),
      planId: z.string().nullish(),
      limit: z.number().default(40),
    }),
    ({ args: { ownerId, planId, limit } }) => {
      let q = zql.workspace.related('plan')
      if (ownerId) q = q.where('ownerId', ownerId)
      if (planId) q = q.where('planId', planId)
      return q.limit(limit)
    },
  ),
  workspaceOrders: defineQuery(
    z.object({
      workspaceId: z.string(),
      limit: z.number().default(40),
    }),
    ({ ctx: { userId }, args: { workspaceId, limit } }) => {
      assertAuthorized(userId)
      return zql.order
        .where('workspaceId', workspaceId)
        .whereExists('workspace', q => q.where('ownerId', userId))
        .related('plan')
        .orderBy('id', 'desc')
        .limit(limit)
    },
  ),
  workspaceUsages: defineQuery(
    z.object({
      workspaceId: z.string(),
      limit: z.number().default(40),
      from: z.string().nullish(),
      to: z.string().nullish(),
    }),
    ({ ctx: { userId }, args: { workspaceId, limit, from, to } }) => {
      assertAuthorized(userId)
      let q = zql.usage
        .where('workspaceId', workspaceId)
        .orderBy('id', 'desc')
        .related('user')
        .limit(limit)
      if (from) q = q.where('id', '>=', from)
      if (to) q = q.where('id', '<=', to)
      return withMember(q, userId)
    },
  ),
  entityAccesses: defineQuery(
    z.string(),
    ({ ctx: { userId }, args: workspaceId }) => {
      assertAuthorized(userId)
      return zql.entityAccess
        .where('userId', userId)
        .where('rootId', workspaceId)
        .related('entity')
        .orderBy('time', 'desc')
    },
  ),
  globalSettings: defineQuery(z.undefined(), () => {
    return zql.globalSettings.one()
  }),
})

export type SearchWithRecords = NonNullable<QueryResultType<typeof queries.searchWithRecords>>
export type FullChat = NonNullable<QueryResultType<typeof queries.fullChat>>
export type FullChannel = NonNullable<QueryResultType<typeof queries.fullChannel>>
export type FullModel = NonNullable<QueryResultType<typeof queries.fullModel>>
export type FullProvider = NonNullable<QueryResultType<typeof queries.fullProvider>>
export type FullMessage = ReturnType<typeof fullMessage> extends Query<'message', DefaultSchema, infer T> ? T : never
export type ToolCall = FullMessage['toolCalls'][number]
export type FullAssistant = NonNullable<QueryResultType<typeof queries.fullAssistant>>
export type FullPage = NonNullable<QueryResultType<typeof queries.fullPage>>
export type FullTranslation = NonNullable<QueryResultType<typeof queries.fullTranslation>>
export type FullItem = NonNullable<QueryResultType<typeof queries.fullItem>>

export type FullEntity = Row['entity'] & { parent?: FullEntity, children?: FullEntity[] }
export type EntityWithItem = Row['entity'] & { item?: Row['item'] }

export type FullWorkspace = NonNullable<QueryResultType<typeof queries.fullWorkspace>>
export type FullMember = FullWorkspace['members'][number]

export type FullUsage = NonNullable<QueryResultType<typeof queries.workspaceUsages>>[number]
