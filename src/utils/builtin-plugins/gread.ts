import type { McpPluginManifest } from 'src/stores/plugins'
import { t } from '../i18n'

export const greadPlugin: McpPluginManifest = {
  id: 'gread',
  type: 'mcp',
  name: t('GitHub Repos'),
  avatar: { type: 'svg', name: 'github' },
  description: t('Give AI access to the source code of all public GitHub repos. Powered by gread.dev.'),
  transport: {
    type: 'http',
    url: 'https://api.gread.dev/mcp',
  },
}
