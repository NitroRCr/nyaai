import { Editor } from '@tiptap/vue-3'
import type { FullPage } from 'app/src-shared/queries'
import { base64ToUint8Array } from 'app/src-shared/utils/functions'
import { staticExtensions } from 'src/components/tiptap-editor/static-extensions'
import Collaboration from '@tiptap/extension-collaboration'
import { Math } from 'src/components/tiptap-editor/math/extension'
import * as Y from 'yjs'

export function getPageEditor(patches: FullPage['patches']) {
  const ydoc = new Y.Doc()

  patches.forEach(patch => {
    Y.applyUpdateV2(ydoc, base64ToUint8Array(patch.patch))
  })

  return new Editor({
    extensions: [
      ...staticExtensions,
      Collaboration.configure({
        document: ydoc,
      }),
      Math,
    ],
    editable: false,
  })
}
