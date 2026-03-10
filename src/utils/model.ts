import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { PUBLIC_ROOT_ID } from 'app/src-shared/utils/config'
import { useWorkspaceStore } from 'src/stores/workspace'
import { providerTypes } from './values'
import type { FullModel } from 'app/src-shared/queries'

export function toSdkModel({ provider, name }: FullModel) {
  const { id, type, settings } = provider!
  if (id === PUBLIC_ROOT_ID) {
    const workspaceStore = useWorkspaceStore()
    return createOpenAICompatible({
      name: 'builtin',
      includeUsage: true,
      headers: {
        'Workspace-Id': workspaceStore.id!,
      },
      baseURL: `${location.origin}/api/v1`,
    }).languageModel(name)
  }
  return providerTypes[type].model.language(settings, name)
}
