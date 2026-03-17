import type { LanguageModelUsage } from 'ai'
import type { OrderProvider, Payment, ToolResultItem } from 'app/src-shared/utils/types'
import { bigint, boolean, foreignKey, index, integer, jsonb, pgTable, serial, text, timestamp, unique, varchar, doublePrecision, real, primaryKey, numeric } from 'drizzle-orm/pg-core'
import { user } from './auth.gen'
import type { MessageType, Avatar, WorkspaceRole, EntityType, ShortcutAction, SearchResult, McpTransport, ToolCallStatus, ModelInputTypes, PlanInterval, PaymentProvider, PromptRole } from 'app/src-shared/utils/validators'

export * from './auth.gen'

const id = () => varchar({ length: 16 })

export const workspace = pgTable('workspace', {
  id: id().primaryKey().references(() => entity.id),
  name: text().notNull(),
  avatar: jsonb().$type<Avatar>(),
  ownerId: text().notNull().references(() => user.id, { onDelete: 'restrict' }),
  planId: text().notNull().references(() => plan.id),
  quotaUsed: doublePrecision().notNull(),
  resetAt: timestamp().notNull(),
  remainingMonths: integer(),
  payment: jsonb().$type<Payment>(),
  storageUsed: bigint({ mode: 'number' }).notNull(),
  trashId: id().notNull().references(() => entity.id),
  perfs: jsonb().notNull().$type<Record<string, any>>(),
  defaultLeftDirId: id().references(() => entity.id, { onDelete: 'set null' }),
}, t => [
  index().on(t.ownerId),
  index().on(t.planId),
  index().on(t.trashId),
  index().on(t.resetAt),
])
export const member = pgTable('member', {
  id: id().primaryKey(),
  workspaceId: id().notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text().notNull().$type<WorkspaceRole>(),
  leftDirId: id().references(() => entity.id, { onDelete: 'set null' }),
}, t => [
  index().on(t.workspaceId),
  index().on(t.userId),
])
export const workspaceInvitation = pgTable('workspaceInvitation', {
  token: id().primaryKey(),
  workspaceId: id().notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  inviterId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text().notNull().$type<Exclude<WorkspaceRole, 'owner'>>(),
  expiresAt: timestamp().notNull(),
  remainingSeats: integer().notNull(),
}, t => [
  index().on(t.workspaceId),
])
export const message = pgTable('message', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  type: text().notNull().$type<MessageType>(),
  assistantId: id().references(() => assistant.id, { onDelete: 'set null' }),
  userId: text().references(() => user.id, { onDelete: 'set null' }),
  sentAt: timestamp(),
  editedAt: timestamp(),
  entityId: id().notNull(),
  text: text().notNull(),
  reasoning: text(),
  error: text(),
  warnings: jsonb().$type<string[]>(),
  usage: jsonb().$type<LanguageModelUsage>(),
  modelName: text(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  unique().on(t.rootId, t.id),
  index().on(t.entityId),
])
export const messageEntity = pgTable('messageEntity', {
  rootId: id().notNull(),
  messageId: id().notNull(),
  entityId: id().notNull().references(() => entity.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [t.messageId, t.entityId] }),
  foreignKey({
    columns: [t.rootId, t.messageId],
    foreignColumns: [message.rootId, message.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const entity = pgTable('entity', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  parentId: id(),
  type: text().notNull().$type<EntityType>(),
  name: text(),
  avatar: jsonb().$type<Avatar>(),
  conf: jsonb().notNull().$type<Record<string, any>>(),
  sortPriority: integer().notNull(),
  hidden: boolean().notNull(),
  pubRoot: id(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.parentId],
    foreignColumns: [t.rootId, t.id],
  }).onDelete('cascade').onUpdate('cascade'),
  unique().on(t.rootId, t.id),
  index().on(t.parentId),
  index().on(t.hidden),
])
export const toolCall = pgTable('toolCall', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  pluginId: id().notNull(),
  messageId: id().notNull(),
  name: text().notNull(),
  input: jsonb().notNull(),
  result: jsonb().$type<ToolResultItem[]>(),
  status: text().notNull().$type<ToolCallStatus>(),
  error: text(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.messageId],
    foreignColumns: [message.rootId, message.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index().on(t.messageId),
])
export const chat = pgTable('chat', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  msgTree: jsonb().notNull().$type<Record<string, string[]>>(),
  msgRoute: jsonb().notNull().$type<Record<string, number>>(),
  plugins: jsonb().$type<string[]>(),
  modelId: id().references(() => model.id, { onDelete: 'set null' }),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const model = pgTable('model', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  entityId: id().notNull(),
  name: text().notNull(),
  label: text(),
  caption: text(),
  avatar: jsonb().$type<Avatar>(),
  inputTypes: jsonb().$type<ModelInputTypes>(),
  settings: jsonb().notNull().$type<Record<string, any>>(),
  inputPrice: real(),
  outputPrice: real(),
  providerOptions: jsonb().$type<Record<string, any>>(),
  sortPriority: integer().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index().on(t.entityId),
])
export const assistant = pgTable('assistant', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  prompt: text(),
  promptTemplate: text(),
  promptRole: text().notNull().$type<PromptRole>(),
  contextNum: integer(),
  streamSettings: jsonb().notNull().$type<Record<string, any>>(),
  plugins: jsonb().notNull().$type<string[]>(),
  modelId: id().references(() => model.id, { onDelete: 'set null' }),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const page = pgTable('page', {
  id: id().primaryKey(),
  rootId: id().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const pagePatch = pgTable('pagePatch', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  entityId: id().notNull(),
  patch: text().notNull(),
  userId: text().references(() => user.id, { onDelete: 'set null' }),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index().on(t.entityId),
])
export const channel = pgTable('channel', {
  id: id().primaryKey(),
  rootId: id().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const provider = pgTable('provider', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  type: text().notNull(),
  settings: jsonb().notNull().$type<Record<string, any>>(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const item = pgTable('item', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  text: text(),
  language: text(),
  blobId: id().references(() => blob.id),
  mimeType: text(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const blob = pgTable('blob', {
  id: id().primaryKey(),
  sha256: text().notNull(),
  sha256Proof: text().notNull(),
  size: bigint({ mode: 'number' }).notNull(),
  refCount: integer().notNull(),
}, t => [
  index().on(t.sha256),
  index().on(t.refCount),
])
export const shortcut = pgTable('shortcut', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  dirId: id().references(() => entity.id, { onDelete: 'set null' }),
  type: text().$type<EntityType>(),
  action: text().$type<ShortcutAction>(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.dirId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const search = pgTable('search', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  currentIndex: integer().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const searchRecord = pgTable('searchRecord', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  entityId: id().notNull(),
  q: text().notNull(),
  results: jsonb().notNull().$type<SearchResult[]>(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index().on(t.entityId),
])
export const translation = pgTable('translation', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  currentIndex: integer().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])
export const translationRecord = pgTable('translationRecord', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  entityId: id().notNull(),
  input: text(),
  output: text(),
  from: text(),
  to: text(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  index().on(t.entityId),
])
export const mcpPlugin = pgTable('mcpPlugin', {
  id: id().primaryKey(),
  rootId: id().notNull(),
  enabled: boolean().notNull(),
  transport: jsonb().notNull().$type<McpTransport>(),
  requestTimeout: integer(),
  resetTimeoutOnProgress: boolean(),
  keepAliveTimeout: integer(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.id],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
])

export const userData = pgTable('userData', {
  id: text().primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  lastWorkspaceId: id().references(() => workspace.id, { onDelete: 'set null' }),
  perfs: jsonb().notNull().$type<Record<string, any>>(),
  data: jsonb().notNull().$type<Record<string, any>>(),
})

export const plan = pgTable('plan', {
  id: text().primaryKey(),
  name: text().notNull(),
  maxMembers: integer().notNull(),
  storageLimit: bigint({ mode: 'number' }).notNull(),
  fileSizeLimit: bigint({ mode: 'number' }).notNull(),
  quotaLimit: doublePrecision().notNull(),
})

export const planPrice = pgTable('planPrice', {
  id: id().primaryKey(),
  enabled: boolean().notNull(),
  planId: text().notNull().references(() => plan.id, { onDelete: 'cascade' }),
  provider: text().notNull().$type<PaymentProvider>(),
  interval: text().notNull().$type<PlanInterval>(),
  amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  priceId: text(),
})

export const usage = pgTable('usage', {
  id: id().primaryKey(),
  workspaceId: id().notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  modelName: text().notNull(),
  cost: real().notNull(),
  details: text().notNull(),
}, t => [
  index().on(t.workspaceId),
])

export const mergePatchesRule = pgTable('mergePatchesRule', {
  id: serial().primaryKey(),
  offset: bigint({ mode: 'number' }).notNull(),
  interval: bigint({ mode: 'number' }).notNull(),
  gap: bigint({ mode: 'number' }).notNull(),
  lastTime: bigint({ mode: 'number' }).notNull(),
})

export const order = pgTable('order', {
  id: id().primaryKey(),
  workspaceId: id().notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  planId: text().notNull().references(() => plan.id),
  planInterval: text().notNull().$type<PlanInterval>(),
  provider: jsonb().notNull().$type<OrderProvider>(),
  amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  completedAt: timestamp(),
}, t => [
  index().on(t.workspaceId),
])

export const entityAccess = pgTable('entityAccess', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  rootId: id().notNull(),
  entityId: id().notNull(),
  time: timestamp().notNull(),
}, t => [
  foreignKey({
    columns: [t.rootId, t.entityId],
    foreignColumns: [entity.rootId, entity.id],
  }).onDelete('cascade').onUpdate('cascade'),
  primaryKey({ columns: [t.entityId, t.userId] }),
  index().on(t.userId, t.time.desc()),
])

export const globalSettings = pgTable('globalSettings', {
  id: text().primaryKey(),
  defaultChatModel: id().references(() => model.id, { onDelete: 'set null' }),
  defaultChatTitleModel: id().references(() => model.id, { onDelete: 'set null' }),
  defaultTranslationModel: id().references(() => model.id, { onDelete: 'set null' }),
  defaultSearchChatModel: id().references(() => model.id, { onDelete: 'set null' }),
  freeModelReqLimit: integer().notNull(),
  freeModelLimitWindow: integer().notNull(),
  maxWorkspacesPerUser: integer().notNull(),
  searchEngines: text().notNull(),
  oauthProviders: jsonb().notNull().$type<string[]>(),
  tosLink: text(),
  privacyPolicyLink: text(),
})
