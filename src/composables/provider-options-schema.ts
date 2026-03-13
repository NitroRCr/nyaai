import type { FullModel } from 'app/src-shared/queries'
import { t } from 'src/utils/i18n'
import type { InferSchema, ObjectSchema } from 'src/utils/types'
import { computed, type Ref } from 'vue'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { google } from '@ai-sdk/google'
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { mergeObjects } from 'src/utils/functions'

interface Rule<S extends ObjectSchema = ObjectSchema> {
  match: (model: FullModel) => boolean
  options: S
  exec: (options: InferSchema<S>) => { providerOptions: Record<string, any>, tools: Record<string, any> }
}

function rule<S extends ObjectSchema>(rule: Rule<S>): Rule<S> {
  return rule
}

const rules = [
  rule({
    match: ({ name, provider }) =>
      provider?.type === 'openai' && provider?.settings.responsesApi &&
      /^(o3|o4|gpt-5)/.test(name),
    options: {},
    exec: () => ({
      providerOptions: {
        openai: {
          reasoningSummary: 'auto',
        },
      },
      tools: {},
    }),
  }),
  rule({
    match: ({ provider }) => provider?.type === 'openai' && provider?.settings.responsesApi,
    options: {
      webSearch: {
        type: 'boolean',
        title: t('Web Search'),
      },
      codeExecution: {
        type: 'boolean',
        title: t('Code Execution'),
      },
      textVerbosity: {
        type: 'enum',
        title: t('Text Verbosity'),
        options: ['low', 'medium', 'high'] as const,
      },
    },
    exec: options => {
      const { webSearch, codeExecution, textVerbosity } = options
      const tools: Record<string, any> = {}
      if (webSearch) tools.web_search_preview = openai.tools.webSearchPreview({})
      if (codeExecution) tools.code_interpreter = openai.tools.codeInterpreter({})

      return {
        providerOptions: {
          openai: {
            textVerbosity,
          },
        },
        tools,
      }
    },
  }),
  rule({
    match: ({ name, provider }) =>
      (provider?.type === 'openai' || provider?.type === 'openaiCompatible') &&
      /^gpt-5/.test(name),
    options: {
      reasoningEffort: {
        title: t('Reasoning Effort'),
        type: 'enum',
        options: ['low', 'medium', 'high'] as const,
      },
    },
    exec: ({ reasoningEffort }) => {
      return {
        providerOptions: {
          openai: { reasoningEffort },
          openaiCompatible: { reasoningEffort },
        },
        tools: {},
      }
    },
  }),
  rule({
    match: ({ name, provider }) => provider?.type === 'google' && /^gemini-3/.test(name),
    options: {
      webSearch: {
        title: t('Web Search'),
        type: 'boolean',
      },
      codeExecution: {
        title: t('Code Execution'),
        type: 'boolean',
      },
      urlContext: {
        title: t('URL Context'),
        type: 'boolean',
      },
      thinkingLevel: {
        title: t('Thinking Level'),
        type: 'enum',
        options: ['minimal', 'low', 'medium', 'high'] as const,
      },
    },
    exec: options => {
      const tools: Record<string, any> = {}
      if (options.webSearch) tools.google_search = google.tools.googleSearch({})
      if (options.codeExecution) tools.code_execution = google.tools.codeExecution({})
      if (options.urlContext) tools.url_context = google.tools.urlContext({})

      const googleOptions: GoogleGenerativeAIProviderOptions = {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: options.thinkingLevel,
        },
      }
      return {
        providerOptions: {
          google: googleOptions,
        },
        tools,
      }
    },
  }),
  rule({
    match: ({ name, provider }) => provider?.type === 'anthropic' && /^claude-(opus|sonnet)-4/.test(name),
    options: {
      codeExecution: {
        title: t('Code Execution'),
        type: 'boolean',
      },
    },
    exec: options => {
      const tools: Record<string, any> = {}
      if (options.codeExecution) tools.code_execution = anthropic.tools.codeExecution_20250825()

      return {
        providerOptions: {},
        tools,
      }
    },
  }),
  rule({
    match: ({ name, provider }) => provider?.type === 'anthropic' && /^claude-(opus|sonnet)-4-6/.test(name),
    options: {
      webSearch: {
        title: t('Web Search'),
        type: 'boolean',
      },
      webFetch: {
        title: t('Web Fetch'),
        type: 'boolean',
      },
      thinkingEffort: {
        title: t('Thinking Effort'),
        type: 'enum',
        options: ['low', 'medium', 'high', 'max'] as const,
      },
    },
    exec: options => {
      const tools: Record<string, any> = {}
      if (options.webSearch) tools.web_search = anthropic.tools.webSearch_20260209()
      if (options.webFetch) tools.web_fetch = anthropic.tools.webFetch_20260209()
      return {
        providerOptions: {
          anthropic: {
            thinking: { type: 'adaptive' },
            effort: options.thinkingEffort,
          } satisfies AnthropicProviderOptions,
        },
        tools,
      }
    },
  }),
]

export function useProviderOptionsSchema(model: Ref<FullModel | undefined>) {
  const activeRules = computed(() => rules.filter(rule => model.value && rule.match(model.value)))
  const schema = computed(() => {
    const matched = activeRules.value
    if (!matched.length) return null
    return mergeObjects(matched.map(rule => rule.options), 0)
  })
  function exec(options: Record<string, any>) {
    const results = activeRules.value.map(r => r.exec(options))
    return {
      providerOptions: mergeObjects(results.map(r => r.providerOptions), 1),
      providerTools: mergeObjects(results.map(r => r.tools), 0),
    }
  }
  return { schema, exec }
}
