import type { EntityType } from 'app/src-shared/utils/validators'
import { mutate } from 'src/utils/zero-session'
import { genId } from 'app/src-shared/utils/id'
import { mutators } from 'app/src-shared/mutators'
import router from 'src/router'
import { Dialog } from 'quasar'
import { t } from './i18n'
import { providerTypes } from './values'
import CreateMcpDialog from 'src/components/CreateMcpDialog.vue'
import CreateShortcutDialog from 'src/components/CreateShortcutDialog.vue'

export async function createEntity(parentId: string, type: EntityType) {
  if (type === 'chat') {
    const id = genId()
    await mutate(mutators.createChat({
      ids: [id, genId()],
      parentId,
    })).client
    router.push(`/chat/${id}`)
  } else if (type === 'page') {
    const id = genId()
    await mutate(mutators.createPage({
      id,
      parentId,
    })).client
    router.push(`/page/${id}`)
  } else if (type === 'translation') {
    const id = genId()
    await mutate(mutators.createTranslation({
      id,
      parentId,
    })).client
    router.push(`/translation/${id}`)
  } else if (type === 'channel') {
    const id = genId()
    await mutate(mutators.createChannel({
      id,
      parentId,
      draftMessageId: genId(),
    })).client
    router.push(`/channel/${id}`)
  } else if (type === 'provider') {
    const defaultType = 'openaiCompatible'
    const id = genId()
    const { label, avatar, initialSettings = {} } = providerTypes[defaultType]
    await mutate(mutators.createProvider({
      id,
      parentId,
      name: label,
      avatar,
      type: defaultType,
      settings: initialSettings,
    })).client
    router.push(`/provider/${id}`)
  } else if (type === 'mcpPlugin') {
    Dialog.create({
      component: CreateMcpDialog,
    }).onOk(({ name, url }) => {
      mutate(mutators.createMcpPlugin({
        id: genId(),
        name,
        parentId,
        transport: {
          type: 'http',
          url,
        },
      }))
    })
  } else if (type === 'shortcut') {
    Dialog.create({
      component: CreateShortcutDialog,
      componentProps: {
        parentId,
      },
    })
  } else if (type === 'folder') {
    Dialog.create({
      title: t('Create Folder'),
      prompt: {
        model: '',
        label: t('Name'),
      },
      cancel: true,
      ok: t('Create'),
    }).onOk(name => {
      mutate(mutators.createFolder({
        id: genId(),
        name,
        parentId,
      }))
    })
  } else if (type === 'search') {
    router.push('/search')
  } else if (type === 'item') {
    router.push('/item')
  }
}
