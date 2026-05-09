import type { PluginManifest } from 'src/stores/plugins'
import { webPlugin } from './web'
import { mermaidPlugin } from './mermaid'
import { workspacePlugin } from './workspace'
import { greadPlugin } from './gread'

export const builtinPlugins: PluginManifest[] = [webPlugin, mermaidPlugin, workspacePlugin, greadPlugin]
