import { Node, VueNodeViewRenderer } from '@tiptap/vue-3'
import EntityLinkWrapper from './EntityLinkWrapper.vue'

export const EntityLink = Node.create({
  name: 'entityLink',
  inline: true,
  group: 'inline',

  addAttributes: () => ({
    entityId: {
      parseHTML: el => el.getAttribute('data-entity-id'),
      renderHTML: attrs => ({ 'data-entity-id': attrs.entityId }),
    },
    text: {
      parseHTML: el => el.textContent,
    },
    href: {
      parseHTML: el => el.getAttribute('href'),
      renderHTML: attrs => ({ href: attrs.href }),
    },
  }),
  parseHTML: () => [{ tag: 'a[data-entity-id]' }],
  renderHTML: ({ node: { attrs }, HTMLAttributes }) => [
    'a',
    HTMLAttributes,
    attrs.text,
  ],

  addNodeView() {
    return VueNodeViewRenderer(EntityLinkWrapper)
  },
})
