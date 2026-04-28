import type { Extensions } from '@tiptap/core'
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style'
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { CodeBlock } from 'src/components/tiptap-editor/code-block/extension'
import { PasteMarkdown } from 'src/components/tiptap-editor/paste-markdown/extension'
import { TableKit } from '@tiptap/extension-table'
import { EntityLink } from 'src/components/tiptap-editor/entity-link/extension'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Image } from 'src/components/tiptap-editor/image/extension'
import { Placeholder } from '@tiptap/extensions'
import { t } from 'src/utils/i18n'

export const staticExtensions: Extensions = [
  StarterKit.configure({
    undoRedo: false,
    codeBlock: false,
    link: {
      openOnClick: false,
    },
  }),
  Markdown,
  PasteMarkdown,
  CodeBlock,
  EntityLink,
  TableKit,
  Image,
  TextStyle, Color, BackgroundColor,
  Details, DetailsSummary, DetailsContent,
  TaskList, TaskItem,
  Placeholder.configure({
    placeholder: t("Type '/' for commands"),
  }),
]
