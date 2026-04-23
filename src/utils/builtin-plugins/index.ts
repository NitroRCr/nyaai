import type { BuiltinPluginManifest } from 'src/stores/plugins'
import { webPlugin } from './web'
import { mermaidPlugin } from './mermaid'
import { workspacePlugin } from './workspace'

export const builtinPlugins: BuiltinPluginManifest[] = [webPlugin, mermaidPlugin, workspacePlugin]
