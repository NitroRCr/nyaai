import type { BuiltinPluginManifest } from 'src/stores/plugins'
import { t } from '../i18n'
import { z } from 'zod'
import { client } from '../hc'
import { useWorkspaceStore } from 'src/stores/workspace'

const searchInputSchema = z.object({
  searches: z.array(z.object({
    q: z.string().describe('The search query'),
    types: z.array(z.enum(['chat', 'channel', 'page', 'item'])).optional().describe('The types of content to search. If omitted, searches all types.'),
    limit: z.int().min(1).max(100).default(15),
  })),
})

export const workspacePlugin: BuiltinPluginManifest = {
  id: 'workspace',
  type: 'builtin',
  name: t('Workspace Search'),
  avatar: { type: 'icon', icon: 'sym_o_manage_search', hue: 135 },
  description: t('Enable AI to search inside the current workspace (chats, channels, pages, and files).'),
  tools: [
    {
      name: 'search',
      inputSchema: z.toJSONSchema(searchInputSchema) as any,
      description: 'Search content in the user\'s current workspace. Can search multiple queries simultaneously. Valid types are "chat" (user conversations with AI), "channel" (workspace member group chats), "page" (collaborative documents/notes), and "item" (files and text attachments). By default, it searches all types.',
      async execute({ searches }: z.infer<typeof searchInputSchema>) {
        const workspaceStore = useWorkspaceStore()
        if (!workspaceStore.id) {
          throw new Error('Workspace is not initialized or selected')
        }

        const res = await Promise.all(searches.map(async args => {
          const result = await client.api.search.$post({
            json: {
              workspaceId: workspaceStore.id!,
              ...args,
            },
          })
          const results = await result.json()
          return {
            q: args.q,
            results,
          }
        }))

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(res, null, 2),
          }],
        }
      },
    },
  ],
  resources: [],
  prompts: [],
}
