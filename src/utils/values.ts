import type { LanguageModel } from 'ai'
import type { Avatar } from 'app/src-shared/utils/validators'
import ky from 'ky'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { t } from 'src/utils/i18n'
import type { InferSchema, ObjectSchema } from './types'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenResponses } from '@ai-sdk/open-responses'
import { createAzure } from '@ai-sdk/azure'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'

export interface ProviderType<S extends ObjectSchema> {
  label: string
  description?: string
  avatar: Avatar
  schema: S
  initialSettings?: Partial<InferSchema<S>>
  getModelList?: (settings: InferSchema<S>) => Promise<string[]>
  model: {
    language: (settings: InferSchema<S>, model: string) => LanguageModel
  }
}

function providerType<S extends ObjectSchema>(pt: ProviderType<S>) {
  return pt
}

async function getModelListCompatible({ baseURL, apiKey }: InferSchema<typeof commonSchema>) {
  const { data } = await ky.get(`${baseURL}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  }).json<any>()
  return data.map(m => m.id)
}

const BaseURLs = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434/api',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com',
  xai: 'https://api.x.ai/v1',
}

const commonSchema = {
  apiKey: {
    type: 'string',
    title: 'API Key',
    format: 'password',
    width: '225px',
  },
  baseURL: {
    type: 'string',
    format: 'url',
    title: t('API Address'),
    width: '225px',
  },
} satisfies ObjectSchema

export const providerTypes = {
  openaiCompatible: providerType({
    label: 'OpenAI Compatible',
    avatar: { type: 'svg', name: 'openai', hue: 160 },
    schema: {
      ...commonSchema,
    },
    getModelList: ({ baseURL, apiKey }) => getModelListCompatible({ baseURL, apiKey }),
    model: {
      language: (settings, model) => createOpenAICompatible({
        name: 'openaiCompatible',
        includeUsage: true,
        ...settings,
        baseURL: settings.baseURL!,
      }).languageModel(model),
    },
  }),
  openai: providerType({
    label: 'OpenAI',
    avatar: { type: 'svg', name: 'openai' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.openai,
      },
      responsesApi: {
        type: 'boolean',
        title: t('Use Responses API'),
      },
    },
    initialSettings: {
      responsesApi: true,
    },
    getModelList: ({ baseURL, apiKey }) => getModelListCompatible({ baseURL: baseURL ?? BaseURLs.openai, apiKey }),
    model: {
      language: (settings, model) => {
        const openai = createOpenAI(settings)
        return settings.responsesApi ? openai.responses(model) : openai.chat(model)
      },
    },
  }),
  openResponses: providerType({
    label: 'Open Responses',
    avatar: { type: 'svg', name: 'openresponses' },
    schema: {
      url: commonSchema.baseURL,
      apiKey: commonSchema.apiKey,
    },
    getModelList: ({ url, apiKey }) => getModelListCompatible({ baseURL: url, apiKey }),
    model: {
      language: (settings, model) => createOpenResponses({
        name: 'openResponses',
        ...settings,
        url: settings.url!,
      }).languageModel(model),
    },
  }),
  google: providerType({
    label: 'Google',
    avatar: { type: 'svg', name: 'google-c' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.google,
      },
    },
    getModelList: async (settings) => {
      const { baseURL = BaseURLs.google } = settings
      if (!settings.apiKey) throw new Error(t('Please enter API key'))
      const { models } = await ky.get(`${baseURL}/models`, {
        headers: {
          'x-goog-api-key': settings.apiKey,
        },
      }).json<any>()
      return models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.split('/').at(-1))
    },
    model: {
      language: (settings, model) => createGoogleGenerativeAI(settings).languageModel(model),
    },
  }),
  anthropic: providerType({
    label: 'Anthropic',
    avatar: { type: 'svg', name: 'anthropic' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.anthropic,
      },
    },
    getModelList: async (settings) => {
      const { baseURL = BaseURLs.anthropic } = settings
      if (!settings.apiKey) throw new Error(t('Please enter API key'))
      const { data } = await ky.get(`${baseURL}/models`, {
        headers: {
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
        },
      }).json<any>()
      return data.map(m => m.id)
    },
    model: {
      language: (settings, model) => createAnthropic(settings).languageModel(model),
    },
  }),
  azure: providerType({
    label: 'Azure',
    avatar: { type: 'svg', name: 'microsoft-c' },
    schema: {
      resourceName: {
        type: 'string',
        title: t('Resource Name'),
      },
      ...commonSchema,
      apiVersion: {
        type: 'string',
        title: t('API Version'),
        placeholder: 'v1',
      },
    },
    model: {
      language: (settings, model) => {
        const azure = createAzure(settings)
        return azure.languageModel(model)
      },
    },
  }),
  xai: providerType({
    label: 'xAI',
    avatar: { type: 'svg', name: 'grok' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.xai,
      },
    },
    getModelList: ({ baseURL, apiKey }) => getModelListCompatible({ baseURL: baseURL ?? BaseURLs.xai, apiKey }),
    model: {
      language: (settings, model) => {
        const xai = createXai(settings)
        return xai.languageModel(model)
      },
    },
  }),
  deepseek: providerType({
    label: 'DeepSeek',
    avatar: { type: 'svg', name: 'deepseek-c' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.deepseek,
      },
    },
    getModelList: ({ baseURL, apiKey }) => getModelListCompatible({ baseURL: baseURL ?? BaseURLs.deepseek, apiKey }),
    model: {
      language: (settings, model) => {
        const deepseek = createDeepSeek(settings)
        return deepseek.languageModel(model)
      },
    },
  }),
  openrouter: providerType({
    label: 'OpenRouter',
    avatar: { type: 'svg', name: 'openrouter' },
    schema: {
      ...commonSchema,
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.openrouter,
      },
    },
    getModelList: ({ baseURL, apiKey }) => getModelListCompatible({ baseURL: baseURL ?? BaseURLs.openrouter, apiKey }),
    model: {
      language: (settings, model) => {
        const openrouter = createOpenRouter(settings)
        return openrouter.languageModel(model)
      },
    },
  }),
  ollama: providerType({
    label: 'Ollama',
    avatar: { type: 'svg', name: 'ollama' },
    schema: {
      baseURL: {
        ...commonSchema.baseURL,
        placeholder: BaseURLs.ollama,
      },
    },
    model: {
      language: (settings, model) => {
        const ollama = createOllama(settings)
        return ollama.languageModel(model)
      },
    },
  }),
}
export type ProviderTypeKeys = keyof typeof providerTypes

export const translationLanguageOptions = [
  'en-US',
  'es-ES',
  'fr-FR',
  'de-DE',
  'it-IT',
  'pt-BR',
  'ru-RU',
  'zh-CN',
  'zh-TW',
  'ja-JP',
  'ko-KR',
]
