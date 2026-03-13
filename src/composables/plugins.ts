import type { Client } from '@modelcontextprotocol/sdk/client'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpPluginManifest } from 'src/stores/plugins'
import { usePluginsStore } from 'src/stores/plugins'
import { computed, shallowRef, watch, type Ref } from 'vue'
import { z } from 'zod'
import { Notify } from 'quasar'
import { t } from 'src/utils/i18n'
import type { PluginPrompt, PluginResource, PluginTool } from 'app/src-shared/utils/types'
import { engine } from 'src/utils/template-engine'
import { PluginsPromptTemplate } from 'src/utils/templates'

export const DefaultKeepAliveTimeout = 300
export const DefaultRequestTimeout = 60

export type PluginStatus = 'starting' | 'ready' | 'failed'

const pool: Record<string, {
  refCount: number
  client: Client
  status: Ref<PluginStatus>
  tools: Ref<PluginTool[]>
  resources: Ref<PluginResource[]>
  prompts: Ref<PluginPrompt[]>
  timeoutId?: number
}> = Object.create(null)

async function clientUp(manifest: McpPluginManifest) {
  if (pool[manifest.id]) {
    const item = pool[manifest.id]
    if (item.timeoutId != null) {
      window.clearTimeout(item.timeoutId)
      delete item.timeoutId
    }
    if (item.status.value === 'ready') {
      item.refCount++
      return
    }
  }
  let refCount = pool[manifest.id]?.refCount ?? 0
  refCount++
  const { Client } = await import('@modelcontextprotocol/sdk/client')
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  const client = new Client({
    name: 'nyaai',
    version: '1.0.0',
  })
  const tools = shallowRef<PluginTool[]>([])
  const resources = shallowRef<PluginResource[]>([])
  const prompts = shallowRef<PluginPrompt[]>([])
  const status = shallowRef<PluginStatus>('starting')
  pool[manifest.id] = {
    refCount,
    client,
    tools,
    resources,
    prompts,
    status,
  }
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(manifest.transport.url)))
  } catch (err) {
    status.value = 'failed'
    console.error(err)
    Notify.create({
      message: t('Failed to connect to MCP server "{0}": {1}', manifest.name, err),
      color: 'negative',
    })
    return
  }
  const capabilities = client.getServerCapabilities()!
  const requestOptions = () => ({
    timeout: (manifest.requestTimeout ?? DefaultRequestTimeout) * 1000,
    resetTimeoutOnProgress: manifest.resetTimeoutOnProgress ?? undefined,
  })
  async function fetchTools() {
    if (!capabilities.tools) return
    const res = await client.listTools()
    tools.value = res.tools.map(tool => ({
      ...tool,
      pluginId: manifest.id,
      execute: input => client.callTool(
        { name: tool.name, arguments: input },
        undefined,
        requestOptions(),
      ) as Promise<CallToolResult>,
    }))
  }
  async function fetchResources() {
    if (!capabilities.resources) return
    const res = await client.listResources()
    client.readResource
    resources.value = res.resources.map(resource => ({
      ...resource,
      pluginId: manifest.id,
      execute: () => client.readResource({ uri: resource.uri }, requestOptions()),
    }))
  }
  async function fetchPrompts() {
    if (!capabilities.prompts) return
    const res = await client.listPrompts()
    prompts.value = res.prompts.map(prompt => ({
      ...prompt,
      pluginId: manifest.id,
      execute: input => client.getPrompt({ name: prompt.name, arguments: input }, requestOptions()),
    }))
  }
  await Promise.all([fetchTools(), fetchResources(), fetchPrompts()])
  client.setNotificationHandler(z.object({
    method: z.literal('notifications/tools/list_changed'),
  }), fetchTools)
  client.setNotificationHandler(z.object({
    method: z.literal('notifications/resources/list_changed'),
  }), fetchResources)
  client.setNotificationHandler(z.object({
    method: z.literal('notifications/prompts/list_changed'),
  }), fetchPrompts)
  status.value = 'ready'
  client.onclose = () => {
    status.value = 'failed'
  }
}
function clientDown(manifest: McpPluginManifest) {
  const item = pool[manifest.id]
  if (!item) return
  item.refCount--
  if (!item.refCount) {
    item.timeoutId = window.setTimeout(() => {
      item.client.close()
      delete pool[manifest.id]
    }, (manifest.keepAliveTimeout ?? DefaultKeepAliveTimeout) * 1000)
  }
}

export type Plugins = Record<string, {
  tools: PluginTool[]
  resources: PluginResource[]
  prompts: PluginPrompt[]
  status: PluginStatus
}>

export function usePlugins(ids: Ref<string[]>) {
  const pluginsStore = usePluginsStore()
  const manifests = computed(() => pluginsStore.plugins.filter(x => ids.value.includes(x.id)))
  watch(manifests, (to, from = []) => {
    from.filter(x => x.type === 'mcp').forEach(clientDown)
    to.filter(x => x.type === 'mcp').forEach(clientUp)
  }, { immediate: true })
  const plugins = computed<Plugins>(() => Object.fromEntries(manifests.value.map(x => [x.id, {
    tools: x.type === 'builtin' ? x.tools : pool[x.id].tools.value,
    resources: x.type === 'builtin' ? x.resources : pool[x.id].resources.value,
    prompts: x.type === 'builtin' ? x.prompts : pool[x.id].prompts.value,
    status: x.type === 'builtin' ? 'ready' : pool[x.id].status.value,
  }])))
  const pluginsPrompt = computed(() => {
    const builtin = manifests.value.filter(x => x.type === 'builtin')
    if (!builtin.length) return ''
    return engine.parseAndRenderSync(PluginsPromptTemplate, {
      plugins: builtin,
    })
  })
  return {
    plugins,
    pluginsPrompt,
  }
}
