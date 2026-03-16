import type { ReadResourceResult, Resource, CallToolResult, Tool, Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js'
import type { CallSettings } from 'ai'

export type TextResultItem = {
  type: 'text'
  text: string
}

export type BlobResultItem = {
  type: 'blob'
  mimeType: string
  itemId: string
}

export type ToolResultItem = TextResultItem | BlobResultItem

export type ModelSettings = Pick<
  CallSettings,
  'temperature' | 'topP' | 'presencePenalty' | 'frequencyPenalty' | 'maxOutputTokens' | 'stopSequences' | 'seed'
>

export type GenerationSettings = Pick<CallSettings, 'maxRetries'> & {
  toolChoice?: 'auto' | 'required' | 'none'
  maxSteps?: number
}

export type StreamSettings = ModelSettings & GenerationSettings

export type Context = {
  locale: string
  userId?: string
  isAdmin?: boolean
}

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    context: Context
  }
}

export type PluginTool = Tool & {
  execute(input: any): Promise<CallToolResult>
}
export type PluginResource = Resource & {
  execute(): Promise<ReadResourceResult>
}
export type PluginPrompt = Prompt & {
  execute(input: Record<string, string>): Promise<GetPromptResult>
}

export type Payment = {
  type: 'stripe'
  customerId: string
  subscriptionId?: string
} | {
  type: 'wxpay'
}

export type OrderProvider = {
  type: 'stripe'
  priceId: string
  customerId: string
  subscriptionId: string
  invoiceId: string
} | {
  type: 'wxpay'
}
