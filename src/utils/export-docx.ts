import type { Editor } from '@tiptap/vue-3'
import { TiptapDocxExporter } from './tiptap-docx'

export async function exportDocx(editor: Editor) {
  const exporter = new TiptapDocxExporter()
  return await exporter.toBlob(editor.getJSON())
}
