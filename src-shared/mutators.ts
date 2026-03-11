import type { JSONObject, TableSchema, Transaction, Row, ServerTransaction } from '@rocicorp/zero'
import { defineMutators, defineMutator } from '@rocicorp/zero'
import { type Schema, schema, zql } from './schema.gen'
import { assert, expandMessageTree, timeMs, typeAvatar } from './utils/functions'
import type { Context } from './utils/types'
import type { WorkspaceRole } from './utils/validators'
import type { WorkspaceContentTable } from './table-permission'
import { assertAuthorized, withRole, withWritable, workspaceContentTables } from './table-permission'
import { zeroToZod } from './utils/zero-to-zod'
import { z } from 'zod'
import { avatarSchema, entityTypeSchema, mcpTransportSchema, memberDataSchema, modelInputTypesSchema, promptRoleSchema, searchResultSchema, shortcutActionSchema, toolCallStatusSchema, workspaceRoleSchema } from './utils/validators'
import { DEFAULT_PLAN_ID } from './utils/config'
import { withLocale } from './utils/i18n'
import { addMonths } from 'date-fns'

const { tables } = schema
type Tables = typeof tables

const requireWritable = Object.fromEntries(workspaceContentTables.map((t: any) => [
  t,
  async (tx, ctx, id) => {
    assertAuthorized(ctx.userId)
    const item = await tx.run(withWritable(
      zql[t].where('id', id),
      ctx.userId,
    ).one())
    assert(item, `${t} ${id} not found`)
    return item
  },
])) as {
  [T in WorkspaceContentTable]: (tx: Transaction<Schema>, ctx: Context, id: string) => Promise<Row<Tables[T]>>
}
async function requireWorkspaceRole(tx: Transaction<Schema>, ctx: Context, id: string, roles: WorkspaceRole[]) {
  assertAuthorized(ctx.userId)
  const workspace = await tx.run(withRole(zql.workspace.where('id', id), ctx.userId, roles).one())
  assert(workspace, 'Workspace not found')
  return workspace
}
function insertSchema<T extends TableSchema>(table: T) {
  return zeroToZod(table).omit({ rootId: true })
}
function updateSchema<T extends TableSchema>(table: T) {
  return zeroToZod(table).partial().required({ id: true }).omit({ rootId: true })
}

export const entityDefaultProps = {
  conf: {},
  sortPriority: 0,
  hidden: false,
} satisfies Partial<Row['entity']>

const switchChain = defineMutator(
  z.object({
    entityId: z.string(),
    target: z.string(),
    value: z.int(),
  }),
  async ({ tx, ctx, args: { entityId, target, value } }) => {
    assertAuthorized(ctx.userId)
    const chat = await requireWritable.chat(tx, ctx, entityId)
    await tx.mutate.chat.update({
      id: entityId,
      msgRoute: {
        ...chat.msgRoute,
        [target]: value,
      },
    })
  },
)

function ensureTimeValid(time: number) {
  const allowLatency = timeMs('10s')
  const now = Date.now()
  return Math.abs(now - time) < allowLatency ? time : now
}

const appendMessage = defineMutator(
  z.object({
    entityId: z.string(),
    target: z.string(),
    props: z.object({
      id: z.string(),
      text: z.string(),
      type: z.enum(['chat:user', 'chat:assistant']),
      assistantId: z.string().nullish(),
      userId: z.string().nullish(),
      sentAt: z.number().nullish(),
    }),
    entities: z.array(z.string()).optional(),
  }),
  async ({ tx, ctx, args: { entityId, target, props, entities = [] } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, msgTree, msgRoute } = await requireWritable.chat(tx, ctx, entityId)
    await tx.mutate.message.insert({
      ...props,
      userId: ctx.userId,
      sentAt: props.sentAt && ensureTimeValid(props.sentAt),
      entityId,
      rootId,
    })
    const children = msgTree[target]
    assert(children, 'Target message not found')
    await tx.mutate.chat.update({
      id: entityId,
      msgTree: {
        ...msgTree,
        [target]: [...children, props.id],
        [props.id]: [],
      },
      msgRoute: {
        ...msgRoute,
        [target]: children.length,
      },
    })
    await Promise.all(entities.map(id =>
      tx.mutate.messageEntity.insert({
        rootId,
        messageId: props.id,
        entityId: id,
      }),
    ))
  },
)
const appendMessagePair = defineMutator(
  z.object({
    entityId: z.string(),
    target: z.string(),
    aProps: insertSchema(tables.message).pick({ id: true, assistantId: true, modelName: true, sentAt: true }),
    uProps: insertSchema(tables.message).pick({ id: true }),
  }),
  async ({ tx, ctx, args: { entityId, target, aProps, uProps } }) => {
    assertAuthorized(ctx.userId)
    await appendMessage.fn({
      tx,
      ctx,
      args: {
        entityId,
        target,
        props: { ...aProps, type: 'chat:assistant', text: '' },
      },
    })
    await appendMessage.fn({
      tx,
      ctx,
      args: {
        entityId,
        target: aProps.id,
        props: { ...uProps, type: 'chat:user', text: '' },
      },
    })
  },
)

const deleteBranch = defineMutator(
  z.object({
    entityId: z.string(),
    parent: z.string(),
    branch: z.int(),
  }),
  async ({ tx, ctx, args: { entityId, parent, branch } }) => {
    assertAuthorized(ctx.userId)
    const chat = await requireWritable.chat(tx, ctx, entityId)
    const anchor = chat.msgTree[parent][branch]
    assert(anchor, 'Anchor not found')
    const ids = expandMessageTree(chat, anchor)
    const msgTree = { ...chat.msgTree }
    const msgRoute = { ...chat.msgRoute }
    msgTree[parent] = msgTree[parent].filter(id => id !== anchor)
    msgRoute[parent] = Math.min(msgRoute[parent], msgTree[parent].length - 1)
    for (const id of ids) {
      await tx.mutate.message.delete({ id })
      delete msgTree[id]
      delete msgRoute[id]
    }
    await tx.mutate.chat.update({
      id: entityId,
      msgTree,
      msgRoute,
    })
  },
)

const createSearchRecord = defineMutator(
  z.object({
    ids: z.array(z.string()).length(3),
    entityId: z.string(),
    q: z.string(),
    results: z.array(searchResultSchema),
  }),
  async ({ tx, ctx, args: { ids, entityId, q, results } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot, type } = await requireWritable.entity(tx, ctx, entityId)
    assert(type === 'search', 'Entity is not a search')
    const [id, aId, uId] = ids
    await tx.mutate.searchRecord.insert({
      id,
      rootId,
      entityId,
      q,
      results,
    })
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'chat',
      parentId: entityId,
      name: q,
    })
    await tx.mutate.chat.insert({
      id,
      rootId,
      msgTree: {
        $root: [aId],
        [aId]: [uId],
        [uId]: [],
      },
      msgRoute: {
        $root: 0,
        [aId]: 0,
      },
    })
    await tx.mutate.message.insert({
      id: aId,
      rootId,
      userId: ctx.userId,
      type: 'chat:assistant',
      entityId: id,
      text: '',
    })
    await tx.mutate.message.insert({
      id: uId,
      rootId,
      userId: ctx.userId,
      type: 'chat:user',
      entityId: id,
      text: '',
    })
  },
)
const createSearch = defineMutator(
  z.object({
    ids: z.array(z.string()).length(4),
    parentId: z.string(),
    q: z.string(),
    results: z.array(searchResultSchema),
  }),
  async ({ tx, ctx, args: { ids, parentId, q, results } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    const [id, ...restIds] = ids
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'search',
      parentId,
      name: q,
    })
    await tx.mutate.search.insert({
      id,
      rootId,
      currentIndex: 0,
    })
    await createSearchRecord.fn({
      tx,
      ctx,
      args: {
        ids: restIds,
        entityId: id,
        q,
        results,
      },
    })
  },
)
const createChat = defineMutator(
  z.object({
    ids: z.array(z.string()).length(2),
    parentId: z.string(),
    name: z.string().optional(),
  }),
  async ({ tx, ctx, args: { ids, parentId, name } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    const [id, uId] = ids
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'chat',
      parentId,
      name,
    })
    await tx.mutate.chat.insert({
      id,
      rootId,
      msgTree: { $root: [uId], [uId]: [] },
      msgRoute: { $root: 0 },
    })
    await tx.mutate.message.insert({
      id: uId,
      rootId,
      userId: ctx.userId,
      type: 'chat:user',
      entityId: id,
      text: '',
    })
  },
)
const createAssistant = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
    name: z.string().optional(),
  }),
  async ({ tx, ctx, args: { id, parentId, name } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      pubRoot,
      parentId,
      rootId,
      type: 'assistant',
      name,
    })
    await tx.mutate.assistant.insert({
      id,
      rootId,
      promptRole: 'system',
      contextNum: 10,
      streamSettings: {},
      plugins: [],
    })
  },
)
const createMcpPlugin = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
    name: z.string().optional(),
    transport: mcpTransportSchema,
  }),
  async ({ tx, ctx, args: { id, parentId, name, transport } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      pubRoot,
      parentId,
      rootId,
      type: 'mcpPlugin',
      name,
    })
    await tx.mutate.mcpPlugin.insert({
      id,
      rootId,
      enabled: true,
      transport,
    })
  },
)

const jsonUpdateSchema = z.object({
  updates: z.record(z.string(), z.any()).optional(),
  deletes: z.array(z.string()).optional(),
})
type JsonUpdateArgs = z.infer<typeof jsonUpdateSchema>
function updateJson(json: JSONObject, { updates, deletes }: JsonUpdateArgs) {
  const res = {
    ...json,
    ...updates,
  }
  deletes?.forEach(key => {
    delete res[key]
  })
  return res
}

const updateUserPerfs = defineMutator(
  jsonUpdateSchema,
  async ({ tx, ctx, args }) => {
    assertAuthorized(ctx.userId)
    const userData = await tx.run(zql.userData.where('id', ctx.userId).one())
    assert(userData, 'User data not found')
    const newPerfs = updateJson(userData.perfs, args)
    await tx.mutate.userData.update({
      id: ctx.userId,
      perfs: newPerfs,
    })
  },
)
const updateUserData = defineMutator(
  jsonUpdateSchema,
  async ({ tx, ctx, args }) => {
    assertAuthorized(ctx.userId)
    const userData = await tx.run(zql.userData.where('id', ctx.userId).one())
    assert(userData, 'User data not found')
    const newUserData = updateJson(userData.data, args)
    await tx.mutate.userData.update({
      id: ctx.userId,
      data: newUserData,
    })
  },
)
const updateWorkspacePerfs = defineMutator(
  jsonUpdateSchema.extend({
    workspaceId: z.string(),
  }),
  async ({ tx, ctx, args: { workspaceId, ...updateArgs } }) => {
    assertAuthorized(ctx.userId)
    const workspace = await requireWorkspaceRole(tx, ctx, workspaceId, ['owner', 'admin'])
    const newPerfs = updateJson(workspace.perfs, updateArgs)
    await tx.mutate.workspace.update({
      id: workspaceId,
      perfs: newPerfs,
    })
  },
)
const updateEntityConf = defineMutator(
  jsonUpdateSchema.extend({
    id: z.string(),
  }),
  async ({ tx, ctx, args: { id, ...updateArgs } }) => {
    assertAuthorized(ctx.userId)
    const entity = await requireWritable.entity(tx, ctx, id)
    const newConf = updateJson(entity.conf, updateArgs)
    await tx.mutate.entity.update({
      id,
      conf: newConf,
    })
  },
)

const updateLastWorkspaceId = defineMutator(
  z.string(),
  async ({ tx, ctx, args: lastWorkspaceId }) => {
    assertAuthorized(ctx.userId)
    const userData = await tx.run(zql.userData.where('id', ctx.userId).one())
    assert(userData, 'User data not found')
    await tx.mutate.userData.update({
      id: ctx.userId,
      lastWorkspaceId,
    })
  },
)
const updateMemberData = defineMutator(
  memberDataSchema.partial().extend({
    workspaceId: z.string(),
  }),
  async ({ tx, ctx, args: { workspaceId, ...updates } }) => {
    assertAuthorized(ctx.userId)
    const member = await tx.run(
      zql.member
        .where('userId', ctx.userId)
        .where('workspaceId', workspaceId)
        .one(),
    )
    assert(member, 'Member not found')
    await tx.mutate.member.update({
      id: member.id,
      ...updates,
    })
  },
)
const updateWorkspace = defineMutator(
  z.object({
    id: z.string(),
    name: z.string().optional(),
    avatar: avatarSchema.optional(),
    defaultLeftDirId: z.string().optional(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWorkspaceRole(tx, ctx, id, ['owner', 'admin'])
    await tx.mutate.workspace.update({
      id,
      ...updates,
    })
  },
)

const createProvider = defineMutator(
  z.object({
    id: z.string(),
    name: z.string().optional(),
    parentId: z.string(),
    avatar: avatarSchema.optional(),
    type: z.string(),
    settings: z.record(z.string(), z.any()),
  }),
  async ({ tx, ctx, args: { id, parentId, name, type, settings, avatar } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'provider',
      name,
      parentId,
      avatar,
    })
    await tx.mutate.provider.insert({
      id,
      rootId,
      type,
      settings,
    })
  },
)
const createModels = defineMutator(
  z.object({
    entityId: z.string(),
    models: z.array(
      insertSchema(tables.model).omit({ entityId: true }).extend({
        avatar: avatarSchema.nullish(),
        inputTypes: modelInputTypesSchema.nullish(),
      }),
    ).optional(),
  }),
  async ({ tx, ctx, args: { entityId, models = [] } }) => {
    assertAuthorized(ctx.userId)
    const { rootId } = await requireWritable.provider(tx, ctx, entityId)
    await Promise.all(models.map(m => tx.mutate.model.insert({ ...m, rootId, entityId })))
  },
)
const createPage = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
    name: z.string().optional(),
  }),
  async ({ tx, ctx, args: { id, parentId, name } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'page',
      name,
      parentId,
    })
    await tx.mutate.page.insert({
      id,
      rootId,
    })
  },
)
const createPagePatch = defineMutator(
  insertSchema(tables.pagePatch),
  async ({ tx, ctx, args: { id, entityId, patch } }) => {
    assertAuthorized(ctx.userId)
    const { rootId } = await requireWritable.page(tx, ctx, entityId)
    await tx.mutate.pagePatch.insert({
      id,
      rootId,
      entityId,
      patch,
    })
  },
)
const createTranslation = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
  }),
  async ({ tx, ctx, args: { id, parentId } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'translation',
      parentId,
    })
    await tx.mutate.translation.insert({
      id,
      rootId,
      currentIndex: 0,
    })
    await tx.mutate.translationRecord.insert({
      id,
      rootId,
      entityId: id,
    })
  },
)
const createChannel = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
    name: z.string().optional(),
    draftMessageId: z.string(),
  }),
  async ({ tx, ctx, args: { id, parentId, name, draftMessageId } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId,
      pubRoot,
      type: 'channel',
      parentId,
      name,
    })
    await tx.mutate.channel.insert({
      id,
      rootId,
    })
    await createDraftMessage.fn({
      tx,
      ctx,
      args: {
        id: draftMessageId,
        channelId: id,
      },
    })
  },
)
const createItemArgs = z.object({
  id: z.string(),
  parentId: z.string(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  language: z.string().optional(),
  hidden: z.boolean().optional(),
})
const createItem = defineMutator(
  createItemArgs,
  async ({ tx, ctx, args: { id, parentId, name, hidden = false, ...itemProps } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      name,
      rootId,
      pubRoot,
      type: 'item',
      parentId,
      hidden,
    })
    await tx.mutate.item.insert({
      id,
      rootId,
      ...itemProps,
    })
  },
)
const createMessageItem = defineMutator(
  createItemArgs.extend({
    messageId: z.string(),
  }),
  async ({ tx, ctx, args: { id, messageId, ...args } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, messageId)
    assert(
      allowInputMessage(message, ctx.userId) ||
      allowUpdateAssistantMessage(message, ctx.userId),
      'Message not found',
    )
    await createItem.fn({
      tx,
      ctx,
      args: {
        id,
        ...args,
      },
    })
    await tx.mutate.messageEntity.insert({
      rootId: message.rootId,
      messageId,
      entityId: id,
    })
  },
)
const createMessageEntities = defineMutator(
  z.object({
    messageId: z.string(),
    entityIds: z.array(z.string()),
  }),
  async ({ tx, ctx, args: { messageId, entityIds } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, messageId)
    await Promise.all(
      entityIds.map(entityId =>
        tx.mutate.messageEntity.insert({
          rootId: message.rootId,
          messageId,
          entityId,
        }),
      ),
    )
  },
)
const createFolder = defineMutator(
  z.object({
    id: z.string(),
    parentId: z.string(),
    name: z.string().optional(),
  }),
  async ({ tx, ctx, args: { id, parentId, name } }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, parentId)
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      name,
      rootId,
      pubRoot,
      parentId,
      type: 'folder',
      sortPriority: 10,
    })
  },
)
const createShortcutArgs = z.object({
  id: z.string(),
  parentId: z.string(),
  name: z.string().nullish(),
  avatar: avatarSchema.nullish(),
  dirId: z.string().nullish(),
  type: entityTypeSchema.nullish(),
  action: shortcutActionSchema.nullish(),
})
type CreateShortcutArgs = z.infer<typeof createShortcutArgs>
const createShortcut = defineMutator(
  createShortcutArgs,
  async ({ tx, ctx, args }) => {
    assertAuthorized(ctx.userId)
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, args.parentId)
    await createShortcutBase(tx, rootId, pubRoot, args)
  },
)
async function createShortcutBase(
  tx: Transaction<Schema>,
  rootId: string,
  pubRoot: string | null,
  { id, parentId, name, avatar, ...props }: CreateShortcutArgs,
) {
  await tx.mutate.entity.insert({
    ...entityDefaultProps,
    id,
    rootId,
    pubRoot,
    type: 'shortcut',
    name,
    parentId,
    avatar,
  })
  await tx.mutate.shortcut.insert({
    id,
    rootId,
    ...props,
  })
}
const createToolCall = defineMutator(
  insertSchema(tables.toolCall).extend({
    status: toolCallStatusSchema,
  }),
  async ({ tx, ctx, args: { messageId, ...props } }) => {
    assertAuthorized(ctx.userId)
    const { rootId } = await requireWritable.message(tx, ctx, messageId)
    await tx.mutate.toolCall.insert({
      rootId,
      messageId,
      ...props,
    })
  },
)
const updateToolCall = defineMutator(
  updateSchema(tables.toolCall).pick({
    id: true,
    error: true,
    result: true,
  }).extend({
    status: toolCallStatusSchema.optional(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.toolCall(tx, ctx, id)
    await tx.mutate.toolCall.update({ id, ...updates })
  },
)

const updateEntity = defineMutator(
  updateSchema(tables.entity).pick({
    id: true,
    name: true,
    hidden: true,
    sortPriority: true,
  }).extend({
    avatar: avatarSchema.optional(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.entity(tx, ctx, id)
    await tx.mutate.entity.update({ id, ...updates })
  },
)
const moveEntities = defineMutator(
  z.object({
    ids: z.array(z.string()),
    to: z.string(),
  }),
  async ({ tx, ctx, args: { ids, to } }) => {
    assertAuthorized(ctx.userId)
    const entities = await tx.run(withWritable(
      zql.entity.where('id', 'IN', ids),
      ctx.userId,
    ))
    const { rootId, pubRoot } = await requireWritable.entity(tx, ctx, to)
    if (tx.location === 'server') {
      const path = await fullPath(tx, to)
      assert(!entities.some(e => path.includes(e.id)), 'Circular reference is not allowed')
    }
    for (const entity of entities) {
      await tx.mutate.entity.update({ id: entity.id, rootId, parentId: to })
      if (entity.pubRoot === entity.id && !pubRoot) continue
      if (pubRoot === entity.pubRoot) continue
      await updatePubRoot(tx, entity.id, pubRoot)
    }
  },
)
async function fullPath(tx: ServerTransaction, entityId: string) {
  const res = await tx.dbTransaction.query(`
    WITH RECURSIVE entity_path AS (
      SELECT
        "id",
        "parentId",
        1 AS depth
      FROM entity
      WHERE "id" = $1

      UNION ALL

      SELECT
        e."id",
        e."parentId",
        ep.depth + 1 AS depth
      FROM entity e
      JOIN entity_path ep ON e."id" = ep."parentId"
    )
    SELECT *
    FROM entity_path
    ORDER BY depth DESC;
  `, [entityId])
  return Array.from(res).map(({ id }) => id as string)
}
const updateProvider = defineMutator(
  updateSchema(tables.provider),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.provider(tx, ctx, id)
    await tx.mutate.provider.update({ id, ...updates })
  },
)
function allowUpdateAssistantMessage(message: Row['message'], userId: string) {
  return message.type.endsWith(':assistant') && message.userId === userId
}
const updateAssistantMessage = defineMutator(
  updateSchema(tables.message).pick({
    id: true,
    text: true,
    reasoning: true,
    error: true,
    warnings: true,
    usage: true,
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, id)
    assert(allowUpdateAssistantMessage(message, ctx.userId), 'Message not found')
    await tx.mutate.message.update({ id, userId: ctx.userId, ...updates })
  },
)
function allowInputMessage(message: Row['message'], userId: string) {
  if (message.type === 'chat:user') return true
  if (message.type === 'channel:draft') return message.userId === userId
  return false
}
const updateInputingMessage = defineMutator(
  updateSchema(tables.message).pick({
    id: true,
    text: true,
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, id)
    assert(allowInputMessage(message, ctx.userId), 'Message not found')
    await tx.mutate.message.update({ id, userId: ctx.userId, ...updates })
  },
)
export function allowEditMessageText(message: Row['message'], userId: string) {
  return message.type.startsWith('chat:') || message.userId === userId
}
const editMessageText = defineMutator(
  updateSchema(tables.message).pick({
    id: true,
    text: true,
  }),
  async ({ tx, ctx, args: { id, text } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, id)
    assert(allowEditMessageText(message, ctx.userId), 'Message not found')
    await tx.mutate.message.update({ id, text, userId: ctx.userId, editedAt: Date.now() })
  },
)
export function allowDeleteMessage(message: Row['message'], userId: string) {
  return message.type.startsWith('channel:') && message.userId === userId
}
const deleteMessage = defineMutator(
  z.string(),
  async ({ tx, ctx, args: id }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, id)
    assert(allowDeleteMessage(message, ctx.userId), 'Message not found')
    await tx.mutate.message.delete({ id })
  },
)
const createDraftMessage = defineMutator(
  z.object({
    id: z.string(),
    channelId: z.string(),
  }),
  async ({ tx, ctx, args: { id, channelId } }) => {
    assertAuthorized(ctx.userId)
    const { rootId } = await requireWritable.channel(tx, ctx, channelId)
    await tx.mutate.message.insert({
      id,
      rootId,
      type: 'channel:draft',
      entityId: channelId,
      text: '',
      userId: ctx.userId,
    })
  },
)
const sendChannelMessage = defineMutator(
  z.object({
    id: z.string(),
    draftMessageId: z.string(),
    sentAt: z.number(),
  }),
  async ({ tx, ctx, args: { id, draftMessageId, sentAt } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, id)
    assert(message.type === 'channel:draft' && message.userId === ctx.userId, 'Message not found')
    await tx.mutate.message.update({ id, type: 'channel:user', sentAt: ensureTimeValid(sentAt) })
    await createDraftMessage.fn({
      tx,
      ctx,
      args: {
        id: draftMessageId,
        channelId: message.entityId,
      },
    })
  },
)
const updateModel = defineMutator(
  updateSchema(tables.model).pick({ id: true, name: true, label: true, caption: true }).extend({
    avatar: avatarSchema.nullish(),
    inputTypes: modelInputTypesSchema.nullish(),
    settings: z.record(z.string(), z.any()).optional(),
    providerOptions: z.record(z.string(), z.any()).nullish(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.model(tx, ctx, id)
    await tx.mutate.model.update({ id, ...updates })
  },
)
const updateChat = defineMutator(
  updateSchema(tables.chat).pick({
    id: true,
    modelId: true,
  }).extend({
    plugins: z.array(z.string()).optional(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.chat(tx, ctx, id)
    await tx.mutate.chat.update({ id, ...updates })
  },
)
const updateSearch = defineMutator(
  updateSchema(tables.search),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.search(tx, ctx, id)
    await tx.mutate.search.update({ id, ...updates })
  },
)
const updateShortcut = defineMutator(
  z.object({
    id: z.string(),
    dirId: z.string().nullish(),
    type: entityTypeSchema.nullish(),
    action: shortcutActionSchema.nullish(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.shortcut(tx, ctx, id)
    await tx.mutate.shortcut.update({ id, ...updates })
  },
)
const updateTranslation = defineMutator(
  updateSchema(tables.translation),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.translation(tx, ctx, id)
    await tx.mutate.translation.update({ id, ...updates })
  },
)
const updateTranslationRecord = defineMutator(
  updateSchema(tables.translationRecord).omit({ entityId: true }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.translationRecord(tx, ctx, id)
    await tx.mutate.translationRecord.update({ id, ...updates })
  },
)
const spliceTranslationRecord = defineMutator(
  z.tuple([
    z.string(),
    insertSchema(tables.translationRecord),
  ]),
  async ({ tx, ctx, args: [start, { entityId, ...props }] }) => {
    assertAuthorized(ctx.userId)
    const { rootId, currentIndex } = await requireWritable.translation(tx, ctx, entityId)
    const records = await tx.run(zql.translationRecord.where('entityId', entityId).where('id', '>', start))
    await Promise.all(records.map(({ id }) => tx.mutate.translationRecord.delete({ id })))
    await tx.mutate.translationRecord.insert({ entityId, rootId, ...props })
    await tx.mutate.translation.update({ id: entityId, currentIndex: currentIndex + 1 })
  },
)
const updateItem = defineMutator(
  z.object({
    id: z.string(),
    text: z.string().nullish(),
    mimeType: z.string().nullish(),
    language: z.string().nullish(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.item(tx, ctx, id)
    await tx.mutate.item.update({ id, ...updates })
  },
)
const updateAssistant = defineMutator(
  updateSchema(tables.assistant).extend({
    promptRole: promptRoleSchema.optional(),
    streamSettings: z.record(z.string(), z.any()).optional(),
  }),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.assistant(tx, ctx, id)
    await tx.mutate.assistant.update({ id, ...updates })
  },
)
const updateMcpPlugin = defineMutator(
  updateSchema(tables.mcpPlugin),
  async ({ tx, ctx, args: { id, ...updates } }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.mcpPlugin(tx, ctx, id)
    await tx.mutate.mcpPlugin.update({ id, ...updates })
  },
)

const deleteModel = defineMutator(
  z.string(),
  async ({ tx, ctx, args: id }) => {
    assertAuthorized(ctx.userId)
    await requireWritable.model(tx, ctx, id)
    await tx.mutate.model.delete({ id })
  },
)
const deleteMessageEntity = defineMutator(
  z.object({
    messageId: z.string(),
    entityId: z.string(),
  }),
  async ({ tx, ctx, args: { messageId, entityId } }) => {
    assertAuthorized(ctx.userId)
    const message = await requireWritable.message(tx, ctx, messageId)
    assert(allowInputMessage(message, ctx.userId), 'Message not found')
    await tx.mutate.messageEntity.delete({ messageId, entityId })
  },
)

const createWorkspace = defineMutator(
  z.object({
    ids: z.array(z.string()).length(23),
    name: z.string(),
  }),
  async ({ tx, ctx, args: { ids, name } }) => {
    assertAuthorized(ctx.userId)
    const settings = await tx.run(zql.globalSettings.one())
    assert(settings, 'Global settings not found')
    const workspaces = await tx.run(zql.workspace.where('ownerId', ctx.userId))
    assert(workspaces.length < settings.maxWorkspacesPerUser, 'Workspace number limit exceeded')
    const [id, trashId, chatAssistantId] = ids.slice(0, 3)

    // create main root
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id,
      rootId: id,
      type: 'folder',
      name: '/',
      conf: {
        chatAssistantId,
        chatModelId: settings.defaultChatModel,
        chatTitleModelId: settings.defaultChatTitleModel,
        translationModelId: settings.defaultTranslationModel,
      },
    })
    // create trash root
    await tx.mutate.entity.insert({
      ...entityDefaultProps,
      id: trashId,
      rootId: trashId,
      type: 'folder',
      name: 'Trash',
    })

    const [
      chatFolderId,
      searchFolderId,
      pagesFolderId,
      translationsFolderId,
      channelsFolderId,
      filesFolderId,
      assistantsFolderId,
      providersFolderId,
      pluginsFolderId,
      shortcutsFolderId,
    ] = ids.slice(3, 13)
    const folderProps = {
      ...entityDefaultProps,
      parentId: id,
      rootId: id,
      type: 'folder' as const,
      sortPriority: 10,
    }
    const t = withLocale(ctx.locale)
    await tx.mutate.entity.insert({
      ...folderProps,
      id: searchFolderId,
      name: t('Search'),
      conf: {
        chatModelId: settings.defaultSearchChatModel,
      },
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: chatFolderId,
      name: t('Chat'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: providersFolderId,
      name: t('Providers'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: pagesFolderId,
      name: t('Pages'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: translationsFolderId,
      name: t('Translations'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: channelsFolderId,
      name: t('Channels'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: filesFolderId,
      name: t('Files'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: assistantsFolderId,
      name: t('Assistants'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: pluginsFolderId,
      name: t('MCP Plugins'),
    })
    await tx.mutate.entity.insert({
      ...folderProps,
      id: shortcutsFolderId,
      name: t('Shortcuts'),
    })

    const [
      chatShortcutId,
      searchShortcutId,
      pageShortcutId,
      translationShortcutId,
      channelShortcutId,
      fileShortcutId,
      assistantShortcutId,
      pluginShortcutId,
      providersShortcutId,
    ] = ids.slice(13, 22)
    await createShortcutBase(tx, id, null, {
      id: chatShortcutId,
      parentId: shortcutsFolderId,
      name: t('Chat'),
      dirId: chatFolderId,
      avatar: typeAvatar('chat'),
      type: 'chat',
      action: 'openLast',
    })
    await createShortcutBase(tx, id, null, {
      id: searchShortcutId,
      parentId: shortcutsFolderId,
      name: t('Search'),
      dirId: searchFolderId,
      avatar: typeAvatar('search'),
      type: 'search',
      action: 'createNew',
    })
    await createShortcutBase(tx, id, null, {
      id: pageShortcutId,
      parentId: shortcutsFolderId,
      name: t('Pages'),
      dirId: pagesFolderId,
      avatar: typeAvatar('page'),
      type: 'page',
      action: 'openLast',
    })
    await createShortcutBase(tx, id, null, {
      id: translationShortcutId,
      parentId: shortcutsFolderId,
      name: t('Translations'),
      dirId: translationsFolderId,
      avatar: typeAvatar('translation'),
      type: 'translation',
      action: 'createNew',
    })
    await createShortcutBase(tx, id, null, {
      id: channelShortcutId,
      parentId: shortcutsFolderId,
      name: t('Channels'),
      dirId: channelsFolderId,
      avatar: typeAvatar('channel'),
      type: 'channel',
      action: 'openLast',
    })
    await createShortcutBase(tx, id, null, {
      id: fileShortcutId,
      parentId: shortcutsFolderId,
      name: t('Files'),
      dirId: filesFolderId,
      avatar: { type: 'icon', icon: 'sym_o_files' },
      type: 'item',
      action: 'createNew',
    })
    await createShortcutBase(tx, id, null, {
      id: assistantShortcutId,
      parentId: shortcutsFolderId,
      name: t('Assistants'),
      dirId: assistantsFolderId,
      avatar: typeAvatar('assistant'),
      type: 'assistant',
      action: 'openLast',
    })
    await createShortcutBase(tx, id, null, {
      id: pluginShortcutId,
      parentId: shortcutsFolderId,
      name: t('MCP Plugins'),
      dirId: pluginsFolderId,
      avatar: typeAvatar('mcpPlugin'),
      type: 'mcpPlugin',
      action: 'openLast',
    })
    await createShortcutBase(tx, id, null, {
      id: providersShortcutId,
      parentId: shortcutsFolderId,
      name: t('Providers'),
      dirId: providersFolderId,
      avatar: typeAvatar('provider'),
      type: 'provider',
      action: 'openLast',
    })
    await tx.mutate.workspace.insert({
      id,
      name,
      ownerId: ctx.userId,
      planId: DEFAULT_PLAN_ID,
      storageUsed: 0,
      quotaUsed: 0,
      resetAt: addMonths(new Date(), 1).getTime(),
      trashId,
      perfs: {},
      defaultLeftDirId: shortcutsFolderId,
    })
    const [memberId] = ids.slice(22, 23)
    await tx.mutate.member.insert({
      id: memberId,
      workspaceId: id,
      userId: ctx.userId,
      role: 'owner',
      leftDirId: shortcutsFolderId,
    })

    await createAssistant.fn({
      tx,
      ctx,
      args: {
        id: chatAssistantId,
        parentId: assistantsFolderId,
        name: t('Default Assistant'),
      },
    })
    tx.mutate.entityAccess.insert({
      entityId: chatAssistantId,
      userId: ctx.userId,
      time: Date.now(),
    })
  },
)
const joinWorkspace = defineMutator(
  z.object({
    memberId: z.string(),
    invitationToken: z.string(),
  }),
  async ({ tx, ctx, args: { memberId, invitationToken } }) => {
    if (tx.location === 'client') return
    assertAuthorized(ctx.userId)
    const invitation = await tx.run(
      zql.workspaceInvitation
        .where('token', invitationToken)
        .related('workspace', q => q.related('members').related('plan'))
        .one(),
    )
    assert(invitation?.workspace, 'Invitation or workspace not found')
    const { workspaceId, role, workspace, remainingSeats, expiresAt } = invitation
    assert(Date.now() < expiresAt, 'Invitation expired')
    assert(remainingSeats > 0, 'No remaining seats')
    assert(workspace.members.length < workspace.plan!.maxMembers, 'Workspace max members exceeded')
    await tx.mutate.workspaceInvitation.update({
      token: invitation.token,
      remainingSeats: remainingSeats - 1,
    })
    await tx.mutate.member.insert({
      id: memberId,
      userId: ctx.userId,
      workspaceId,
      role,
      leftDirId: workspace.defaultLeftDirId,
    })
  },
)
const createInvitation = defineMutator(
  z.object({
    workspaceId: z.string(),
    role: workspaceRoleSchema.exclude(['owner']),
    token: z.string(),
    expiresAt: z.number(),
    remainingSeats: z.number(),
  }),
  async ({ tx, ctx, args: { workspaceId, ...props } }) => {
    assertAuthorized(ctx.userId)
    await requireWorkspaceRole(tx, ctx, workspaceId, ['owner', 'admin'])
    await tx.mutate.workspaceInvitation.insert({
      workspaceId,
      inviterId: ctx.userId,
      ...props,
    })
  },
)
const deleteInvitation = defineMutator(
  z.string(),
  async ({ tx, ctx, args: token }) => {
    assertAuthorized(ctx.userId)
    const invitation = await tx.run(
      zql.workspaceInvitation
        .where('token', token)
        .where('inviterId', ctx.userId)
        .one(),
    )
    assert(invitation, 'Invitation not found')
    await tx.mutate.workspaceInvitation.delete({ token })
  },
)
const recycleEntities = defineMutator(
  z.object({
    workspaceId: z.string(),
    ids: z.array(z.string()),
  }),
  async ({ tx, ctx, args: { workspaceId, ids } }) => {
    assertAuthorized(ctx.userId)
    const { trashId } = await requireWorkspaceRole(tx, ctx, workspaceId, ['owner', 'admin', 'member'])
    const entities = await tx.run(zql.entity.where('rootId', workspaceId).where('id', 'IN', ids))
    await Promise.all(entities.map(e =>
      tx.mutate.entity.update({
        id: e.id,
        rootId: trashId,
        parentId: trashId,
      }),
    ))
  },
)
const restoreEntities = defineMutator(
  z.object({
    workspaceId: z.string(),
    ids: z.array(z.string()),
    to: z.string(),
  }),
  async ({ tx, ctx, args: { workspaceId, ids, to } }) => {
    assertAuthorized(ctx.userId)
    const { trashId } = await requireWorkspaceRole(tx, ctx, workspaceId, ['owner', 'admin', 'member'])
    const entities = await tx.run(zql.entity.where('parentId', trashId).where('id', 'IN', ids))
    await Promise.all(entities.map(e =>
      tx.mutate.entity.update({
        id: e.id,
        rootId: workspaceId,
        parentId: to,
      }),
    ))
  },
)
const deleteEntities = defineMutator(
  z.object({
    workspaceId: z.string(),
    ids: z.array(z.string()).nullish(),
  }),
  async ({ tx, ctx, args: { workspaceId, ids } }) => {
    assertAuthorized(ctx.userId)
    const { trashId } = await requireWorkspaceRole(tx, ctx, workspaceId, ['owner', 'admin', 'member'])
    const query = zql.entity.where('parentId', trashId)
    const entities = await tx.run(ids ? query.where('id', 'IN', ids) : query)
    await Promise.all(entities.map(e =>
      tx.mutate.entity.delete({ id: e.id }),
    ))
  },
)
const directDeleteEntities = defineMutator(
  z.array(z.string()),
  async ({ tx, ctx, args: ids }) => {
    assertAuthorized(ctx.userId)
    const entities = await tx.run(withWritable(
      zql.entity.where('id', 'IN', ids),
      ctx.userId,
    ))
    await Promise.all(entities.map(({ id }) =>
      tx.mutate.entity.delete({ id }),
    ))
  },
)
async function updatePubRoot(tx: Transaction<Schema>, entityId: string, pubRoot: string | null) {
  if (tx.location === 'client') {
    await tx.mutate.entity.update({ id: entityId, pubRoot })
    return
  }
  await tx.dbTransaction.query(`
    WITH RECURSIVE tree AS (
      SELECT id
      FROM "entity"
      WHERE id = $1

      UNION ALL

      SELECT e.id
      FROM "entity" e
      JOIN tree t ON e."parentId" = t.id
    )
    UPDATE "entity" AS e
    SET "pubRoot" = $2
    WHERE e.id IN (SELECT id FROM tree);
  `, [entityId, pubRoot])
}
const publishEntity = defineMutator(
  z.string(),
  async ({ tx, ctx, args: id }) => {
    assertAuthorized(ctx.userId)
    const { pubRoot } = await requireWritable.entity(tx, ctx, id)
    assert(!pubRoot, 'Entity already published')
    await updatePubRoot(tx, id, id)
  },
)
const unpublishEntity = defineMutator(
  z.string(),
  async ({ tx, ctx, args: id }) => {
    assertAuthorized(ctx.userId)
    const { pubRoot } = await requireWritable.entity(tx, ctx, id)
    assert(pubRoot === id, 'This entity is not publication root')
    await updatePubRoot(tx, id, null)
  },
)
const changeMemberRole = defineMutator(
  z.object({
    id: z.string(),
    role: z.enum(['admin', 'member', 'guest']),
  }),
  async ({ tx, ctx: { userId }, args: { id, role } }) => {
    assertAuthorized(userId)
    const workspace = await tx.run(
      withRole(zql.workspace, userId, ['owner', 'admin'])
        .whereExists('member', q => q.where('id', id).where('role', '!=', 'owner'))
        .one(),
    )
    assert(workspace, 'Member not found')
    await tx.mutate.member.update({ id, role })
  },
)
const removeMember = defineMutator(
  z.string(),
  async ({ tx, ctx: { userId }, args: id }) => {
    assertAuthorized(userId)
    const workspace = await tx.run(
      withRole(zql.workspace, userId, ['owner', 'admin'])
        .whereExists('member', q => q.where('id', id).where('role', '!=', 'owner'))
        .one(),
    )
    assert(workspace, 'Member not found')
    await tx.mutate.member.delete({ id })
  },
)
const leaveWorkspace = defineMutator(
  z.string(),
  async ({ tx, ctx: { userId }, args: workspaceId }) => {
    assertAuthorized(userId)
    const member = await tx.run(
      zql.member
        .where('userId', userId)
        .where('workspaceId', workspaceId)
        .where('role', '!=', 'owner')
        .one(),
    )
    assert(member, 'Member not found')
    await tx.mutate.member.delete({ id: member.id })
  },
)
const deleteWorkspace = defineMutator(
  z.string(),
  async ({ tx, ctx: { userId }, args: workspaceId }) => {
    assertAuthorized(userId)
    const member = await tx.run(
      zql.member
        .where('userId', userId)
        .where('workspaceId', workspaceId)
        .where('role', 'owner')
        .one(),
    )
    assert(member, 'Member not found')
    await tx.mutate.workspace.delete({ id: workspaceId })
  },
)
const updateUser = defineMutator(
  z.object({
    name: z.string().optional(),
    image: z.string().optional(),
  }),
  async ({ tx, ctx: { userId }, args: updates }) => {
    assertAuthorized(userId)
    await tx.mutate.user.update({ id: userId, ...updates })
  },
)
const accessEntity = defineMutator(
  z.object({
    entityId: z.string(),
    time: z.number(),
  }),
  async ({ tx, ctx: { userId }, args: { entityId, time } }) => {
    assertAuthorized(userId)
    await tx.mutate.entityAccess.upsert({
      userId,
      entityId,
      time: ensureTimeValid(time),
    })
  },
)
export const mutators = defineMutators({
  switchChain,
  appendMessage,
  appendMessagePair,
  deleteBranch,
  createSearchRecord,
  createSearch,
  createChat,
  createAssistant,
  createProvider,
  createModels,
  createPage,
  createPagePatch,
  createTranslation,
  createChannel,
  createShortcut,
  createItem,
  createMcpPlugin,
  createMessageItem,
  createMessageEntities,
  updateLastWorkspaceId,
  updateMemberData,
  updateUserPerfs,
  updateUserData,
  updateWorkspacePerfs,
  updateEntityConf,
  updateWorkspace,
  createFolder,
  updateEntity,
  createToolCall,
  updateToolCall,
  updateProvider,
  updateAssistantMessage,
  updateInputingMessage,
  editMessageText,
  deleteMessage,
  sendChannelMessage,
  createDraftMessage,
  updateModel,
  updateChat,
  updateSearch,
  updateShortcut,
  updateTranslation,
  updateTranslationRecord,
  spliceTranslationRecord,
  updateItem,
  updateAssistant,
  updateMcpPlugin,
  deleteModel,
  deleteMessageEntity,
  createWorkspace,
  joinWorkspace,
  createInvitation,
  deleteInvitation,
  recycleEntities,
  restoreEntities,
  deleteEntities,
  directDeleteEntities,
  publishEntity,
  unpublishEntity,
  moveEntities,
  changeMemberRole,
  removeMember,
  leaveWorkspace,
  deleteWorkspace,
  updateUser,
  accessEntity,
})
