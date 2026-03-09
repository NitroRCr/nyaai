import Front from 'src/AppFront.vue'
import MainLayout from 'src/layouts/MainLayout.vue'
import DualViewPage from 'src/pages/DualViewPage.vue'
import NotFoundPage from 'src/pages/NotFoundPage.vue'
import SearchIndex from 'src/pages/SearchIndex.vue'
import type { RouteRecordRaw } from 'vue-router'
import { authRoute } from './auth'
import WorkspaceLayout from 'src/layouts/WorkspaceLayout.vue'
import InvitationLayout from 'src/layouts/InvitationLayout.vue'
import TrashLayout from 'src/layouts/TrashLayout.vue'
import PublishedLayout from 'src/layouts/PublishedLayout.vue'
import SettingsLayout from 'src/layouts/SettingsLayout.vue'
import WorkspaceOverview from 'src/pages/WorkspaceOverview.vue'
import WorkspacePlans from 'src/pages/WorkspacePlans.vue'
import WorkspaceOrders from 'src/pages/WorkspaceOrders.vue'
import AccountLayout from 'src/layouts/AccountLayout.vue'
import ChatWelcome from 'src/pages/ChatWelcome.vue'
import TranslationWelcome from 'src/pages/TranslationWelcome.vue'
import PageWelcome from 'src/pages/PageWelcome.vue'
import IndexPage from 'src/pages/IndexPage.vue'
import ProviderWelcome from 'src/pages/ProviderWelcome.vue'
import ChannelWelcome from 'src/pages/ChannelWelcome.vue'
import IndexWelcome from 'src/pages/IndexWelcome.vue'
import ItemWelcome from 'src/pages/ItemWelcome.vue'
import ItemIndex from 'src/pages/ItemIndex.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Front,
    children: [
      {
        path: '/',
        component: MainLayout,
        children: [
          { path: '/', component: IndexPage },
          { path: '/welcome', component: IndexWelcome },
        ],
      },
      {
        path: '/:type(search|chat|page|translation|channel|item|folder|assistant|mcpPlugin|provider)',
        component: MainLayout,
        children: [
          { path: '/:type(search)', component: SearchIndex },
          { path: '/:type(item)', component: ItemIndex },
          { path: '/:type(chat)/welcome', component: ChatWelcome },
          { path: '/:type(translation)/welcome', component: TranslationWelcome },
          { path: '/:type(page)/welcome', component: PageWelcome },
          { path: '/:type(provider)/welcome', component: ProviderWelcome },
          { path: '/:type(channel)/welcome', component: ChannelWelcome },
          { path: '/:type(item)/welcome', component: ItemWelcome },
          { path: ':id', component: DualViewPage },
        ],
      },
      {
        path: '/workspace',
        component: WorkspaceLayout,
        children: [
          {
            path: '',
            component: WorkspaceOverview,
          },
          {
            path: 'plans',
            component: WorkspacePlans,
          },
          {
            path: 'orders',
            component: WorkspaceOrders,
          },
        ],
      },
      {
        path: '/published',

        component: PublishedLayout,
      },
      {
        path: '/trash',
        component: TrashLayout,
      },
      {
        path: '/invitations/:token',
        component: InvitationLayout,
        props: true,
      },
      {
        path: '/settings',
        component: SettingsLayout,
      },
      {
        path: '/account',
        component: AccountLayout,
      },
      authRoute,
      // Always leave this as last one,
      // but you can also remove it
      {
        path: '/:catchAll(.*)*',
        component: NotFoundPage,
      },
    ],
  },
]

export default routes
