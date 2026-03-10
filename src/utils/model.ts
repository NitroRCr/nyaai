import { PUBLIC_ROOT_ID } from 'app/src-shared/utils/config'
import { useWorkspaceStore } from 'src/stores/workspace'
import { providerTypes } from './values'
import type { FullModel } from 'app/src-shared/queries'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export function toSdkModel({ provider, name }: FullModel) {
  const { id, type, settings } = provider!
  if (id === PUBLIC_ROOT_ID) {
    const workspaceStore = useWorkspaceStore()
    return createOpenRouter({
      headers: {
        'Workspace-Id': workspaceStore.id!,
      },
      baseURL: `${location.origin}/api/v1`,
      apiKey: 'any',
    }).languageModel(name)
  }
  return providerTypes[type].model.language(settings, name)
}
