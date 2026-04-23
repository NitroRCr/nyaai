import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Extension } from '@tiptap/vue-3'
import 'katex/dist/katex.min.css'

export const Math = Extension.create({
  name: 'Mathematics',

  addOptions() {
    return {
      onClick: undefined as any,
    }
  },

  addExtensions() {
    return [
      BlockMath.extend({
        markdownTokenizer: {
          name: 'blockMath',
          level: 'block',
          start: src => src.includes('\\[') ? src.indexOf('\\[') : src.indexOf('$$'),
          tokenize: src => {
            const match = src.match(/^\\\[([\s\S]+?)\\\]/) ?? src.match(/^\$\$([^$]+)\$\$/)
            if (!match) return undefined

            const [fullMatch, latex] = match

            return {
              type: 'blockMath',
              raw: fullMatch,
              latex: latex.trim(),
            }
          },
        },
      }).configure({
        onClick: this.options.onClick,
      }),
      InlineMath.extend({
        markdownTokenizer: {
          name: 'inlineMath',
          level: 'inline',
          start: src => src.includes('\\(') ? src.indexOf('\\(') : src.indexOf('$'),
          tokenize: src => {
            const match = src.match(/^\\\((.+?)\\\)/) ?? src.match(/^\$([^$]+)\$(?!\$)/)
            if (!match) return undefined

            const [fullMatch, latex] = match

            return {
              type: 'inlineMath',
              raw: fullMatch,
              latex: latex.trim(),
            }
          },
        },
      }).configure({
        onClick: this.options.onClick,
      }),
    ]
  },
})
