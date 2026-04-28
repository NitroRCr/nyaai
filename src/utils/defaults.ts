import type { Avatar, ModelInputTypes } from 'app/src-shared/utils/validators'
import type { Row } from '@rocicorp/zero'
import { t } from './i18n'
import { typeAvatar } from 'app/src-shared/utils/functions'
import { stringHue } from './functions'

const unknownAvatar: Avatar = { type: 'icon', icon: 'sym_o_question_mark' }

export type PartialEntity = Pick<Row['entity'], 'avatar' | 'type' | 'id' | 'name'>

export function entityAvatar(entity: PartialEntity | null | undefined): Avatar {
  if (!entity) return unknownAvatar
  if (entity.avatar) return entity.avatar
  if (entity.type === 'assistant') return { type: 'text', text: 'AI', hue: stringHue(entity.id) }
  return typeAvatar(entity.type) ?? unknownAvatar
}

export function entityName(entity: PartialEntity | null | undefined) {
  if (!entity) return ''
  if (entity.name === '$chat') return t('Chat')
  if (entity.name === '$search') return t('Search')
  if (entity.name === '$pages') return t('Pages')
  if (entity.name === '$channels') return t('Channels')
  if (entity.name === '$translations') return t('Translations')
  if (entity.name === '$files') return t('Files')
  if (entity.name === '$assistants') return t('Assistants')
  if (entity.name === '$mcpPlugins') return t('MCP Plugins')
  if (entity.name === '$providers') return t('Providers')
  if (entity.name === '$shortcuts') return t('Shortcuts')
  if (entity.name === '$defaultAssistant') return t('Default Assistant')

  if (entity.name) return entity.name
  if (entity.type === 'folder') return t('New folder')
  if (entity.type === 'channel') return t('New channel')
  if (entity.type === 'search') return t('New search')
  if (entity.type === 'chat') return t('New chat')
  if (entity.type === 'page') return t('New page')
  if (entity.type === 'translation') return t('New translation')
  if (entity.type === 'provider') return t('New provider')
  if (entity.type === 'assistant') return t('New assistant')
  if (entity.type === 'mcpPlugin') return t('MCP Plugin')
  if (entity.type === 'item') return t('New item')
  return ''
}

export function modelName(model: Row['model'] | null | undefined) {
  if (!model) return ''
  return model.label || model.name
}

export function userAvatar(user: Row['user'] | null | undefined): Avatar {
  if (!user) return unknownAvatar
  if (user.image) return { type: 'url', url: user.image, hue: stringHue(user.id) }
  return { type: 'text', text: user.name[0].toUpperCase(), hue: stringHue(user.id) }
}

export function workspaceAvatar(workspace: Row['workspace'] | null | undefined): Avatar {
  if (!workspace) return unknownAvatar
  if (workspace.avatar) return workspace.avatar
  return { type: 'icon', icon: 'sym_o_deployed_code' }
}

const prefixMap = {
  openai: ['gpt', 'chatgpt', 'openai', 'o1', 'o3', 'o4'],
  'claude-c': ['claude', 'c-', 'anthropic'],
  'gemini-c': ['gemini', 'google'],
  'gemma-c': ['gemma'],
  'meta-c': ['llama', 'meta'],
  'mistral-c': ['mistral'],
  'qwen-c': ['qwen', 'qwq'],
  'deepseek-c': ['deepseek'],
  grok: ['grok', 'xai'],
  'kimi-c': ['kimi', 'moonshot'],
  'doubao-c': ['doubao', 'bytedance'],
}

export function modelAvatar(model: Row['model'] | null | undefined): Avatar {
  if (!model) return unknownAvatar
  if (model.avatar) return model.avatar
  for (const [name, prefixes] of Object.entries(prefixMap)) {
    if (prefixes.some(prefix => model.name.toLocaleLowerCase().startsWith(prefix))) return { type: 'svg', name }
  }
  return { type: 'icon', icon: 'sym_o_neurology' }
}

const defaultModelInputTypes: ModelInputTypes = {
  user: ['image/*'],
  assistant: [],
  tool: [],
}
export function modelInputTypes(model: Row['model'] | null | undefined) {
  return model?.inputTypes ?? defaultModelInputTypes
}
