import { computePosition, flip, shift } from '@floating-ui/dom'
import type { Editor, Range } from '@tiptap/vue-3'
import { posToDOMRect, VueRenderer } from '@tiptap/vue-3'
import CommandList from './CommandList.vue'

const updatePosition = (editor, element) => {
  const virtualElement = {
    getBoundingClientRect: () => posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to),
  }

  computePosition(virtualElement, element, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = 'max-content'
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}

type SuggestionItem = {
  title: string
  icon: string
  command: (props: { editor: Editor, range: Range }) => void
}

export const suggestion = (items: SuggestionItem[]) => ({
  allow: ({ editor }) => {
    return !editor.isActive('codeBlock') && !editor.isActive('code')
  },

  items: ({ query }) => items
    .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 10),

  render: () => {
    let component

    return {
      onStart: props => {
        component = new VueRenderer(CommandList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        component.element.style.position = 'absolute'

        document.body.appendChild(component.element)

        updatePosition(props.editor, component.element)
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        updatePosition(props.editor, component.element)
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          component.destroy()
          component.element.remove()

          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        component.destroy()
        component.element.remove()
      },
    }
  },
})
