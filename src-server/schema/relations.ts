import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, r => ({
  workspace: {
    member: r.one.member(),
    members: r.many.member(),
    root: r.one.entity({ from: r.workspace.id, to: r.entity.id }),
    trash: r.one.entity({ from: r.workspace.trashId, to: r.entity.id }),
    plan: r.one.plan({ from: r.workspace.planId, to: r.plan.id }),
    invitations: r.many.workspaceInvitation(),
  },
  member: {
    workspace: r.one.workspace({ from: r.member.workspaceId, to: r.workspace.id }),
    user: r.one.user({ from: r.member.userId, to: r.user.id }),
  },
  workspaceInvitation: {
    workspace: r.one.workspace({ from: r.workspaceInvitation.workspaceId, to: r.workspace.id }),
    inviter: r.one.user({ from: r.workspaceInvitation.inviterId, to: r.user.id }),
  },
  message: {
    member: r.one.member({ from: r.message.rootId, to: r.member.workspaceId }),
    toolCalls: r.many.toolCall(),
    assistant: r.one.assistant({
      from: [r.message.rootId, r.message.assistantId],
      to: [r.assistant.rootId, r.assistant.id],
    }),
    user: r.one.user({ from: r.message.userId, to: r.user.id }),
    entities: r.many.entity({
      from: [r.message.rootId.through(r.messageEntity.rootId), r.message.id.through(r.messageEntity.messageId)],
      to: [r.entity.rootId.through(r.messageEntity.rootId), r.entity.id.through(r.messageEntity.entityId)],
    }),
    entity: r.one.entity({ from: r.message.id, to: r.entity.id }),
  },
  entity: {
    workspace: r.one.workspace({ from: r.entity.rootId, to: r.workspace.id }),
    trashWorkspace: r.one.workspace({ from: r.entity.parentId, to: r.workspace.trashId }),
    member: r.one.member({ from: r.entity.rootId, to: r.member.workspaceId }),
    parent: r.one.entity({ from: r.entity.parentId, to: r.entity.id }),
    children: r.many.entity({ from: r.entity.id, to: r.entity.parentId }),
    item: r.one.item({ from: r.entity.id, to: r.item.id }),
    entity: r.one.entity({ from: r.entity.id, to: r.entity.id }),
  },
  toolCall: {
    member: r.one.member({ from: r.toolCall.rootId, to: r.member.workspaceId }),
    message: r.one.message({ from: r.toolCall.messageId, to: r.message.id }),
    entity: r.one.entity({
      from: r.toolCall.messageId.through(r.message.id),
      to: r.entity.id.through(r.message.entityId),
    }),
  },
  chat: {
    member: r.one.member({ from: r.chat.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.chat.id, to: r.entity.id }),
    messages: r.many.message({ from: r.chat.id, to: r.message.entityId }),
  },
  channel: {
    member: r.one.member({ from: r.channel.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.channel.id, to: r.entity.id }),
    message: r.one.message({ from: r.channel.id, to: r.message.entityId }),
    messages: r.many.message({ from: r.channel.id, to: r.message.entityId }),
  },
  model: {
    member: r.one.member({ from: r.model.rootId, to: r.member.workspaceId }),
    provider: r.one.provider({ from: r.model.entityId, to: r.provider.id }),
    entity: r.one.entity({ from: r.model.entityId, to: r.entity.id }),
  },
  assistant: {
    member: r.one.member({ from: r.assistant.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.assistant.id, to: r.entity.id }),
  },
  page: {
    member: r.one.member({ from: r.page.rootId, to: r.member.workspaceId }),
    patches: r.many.pagePatch(),
    entity: r.one.entity({ from: r.page.id, to: r.entity.id }),
  },
  pagePatch: {
    member: r.one.member({ from: r.pagePatch.rootId, to: r.member.workspaceId }),
    page: r.one.page({ from: r.pagePatch.entityId, to: r.page.id }),
    entity: r.one.entity({ from: r.pagePatch.entityId, to: r.entity.id }),
    user: r.one.user({ from: r.pagePatch.userId, to: r.user.id }),
  },
  provider: {
    member: r.one.member({ from: r.provider.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.provider.id, to: r.entity.id }),
    models: r.many.model(),
  },
  item: {
    workspace: r.one.workspace({ from: r.item.rootId, to: r.workspace.id }),
    member: r.one.member({ from: r.item.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.item.id, to: r.entity.id }),
    blob: r.one.blob({ from: r.item.blobId, to: r.blob.id }),
  },
  search: {
    member: r.one.member({ from: r.search.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.search.id, to: r.entity.id }),
    records: r.many.searchRecord(),
  },
  searchRecord: {
    member: r.one.member({ from: r.searchRecord.rootId, to: r.member.workspaceId }),
    search: r.one.search({ from: r.searchRecord.entityId, to: r.search.id }),
    entity: r.one.entity({ from: r.searchRecord.entityId, to: r.entity.id }),
  },
  translation: {
    member: r.one.member({ from: r.translation.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.translation.id, to: r.entity.id }),
    records: r.many.translationRecord(),
  },
  translationRecord: {
    member: r.one.member({ from: r.translationRecord.rootId, to: r.member.workspaceId }),
    translation: r.one.translation({ from: r.translationRecord.entityId, to: r.translation.id }),
    entity: r.one.entity({ from: r.translationRecord.entityId, to: r.entity.id }),
  },
  shortcut: {
    member: r.one.member({ from: r.shortcut.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.shortcut.id, to: r.entity.id }),
  },
  mcpPlugin: {
    member: r.one.member({ from: r.mcpPlugin.rootId, to: r.member.workspaceId }),
    entity: r.one.entity({ from: r.mcpPlugin.id, to: r.entity.id }),
  },
  userData: {
    user: r.one.user({ from: r.userData.id, to: r.user.id }),
  },
  usage: {
    member: r.one.member({ from: r.usage.workspaceId, to: r.member.workspaceId }),
    workspace: r.one.workspace({ from: r.usage.workspaceId, to: r.workspace.id }),
    user: r.one.user({ from: r.usage.userId, to: r.user.id }),
  },
  plan: {
    prices: r.many.planPrice({ from: r.plan.id, to: r.planPrice.planId }),
  },
  order: {
    workspace: r.one.workspace({ from: r.order.workspaceId, to: r.workspace.id }),
    plan: r.one.plan({ from: r.order.planId, to: r.plan.id }),
  },
  entityAccess: {
    entity: r.one.entity({ from: r.entityAccess.entityId, to: r.entity.id }),
  },
}))
