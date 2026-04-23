import { TiptapTransformer } from '@hocuspocus/transformer'
import * as Y from 'yjs'
import { db } from './db'
import { page } from '../schema/schema'
import { eq } from 'drizzle-orm'
import { base64ToUint8Array } from 'app/src-shared/utils/functions'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function updatePageText(entityId: string, debounceMs = 10000) {
  if (timers.has(entityId)) clearTimeout(timers.get(entityId))

  timers.set(entityId, setTimeout(() => {
    timers.delete(entityId)
    doUpdatePageText(entityId)
  }, debounceMs))
}

function extractText(node: any): string {
  if (node.type === 'text') return node.text || ''
  if (node.type === 'image') return node.attrs?.alt || ''
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).filter(Boolean).join(' ')
  }
  return ''
}

export async function doUpdatePageText(entityId: string) {
  const patches = await db.query.pagePatch.findMany({
    where: { entityId },
  })

  const ydoc = new Y.Doc()
  for (const { patch } of patches) {
    Y.applyUpdateV2(ydoc, base64ToUint8Array(patch))
  }

  const json = TiptapTransformer.fromYdoc(ydoc)
  const defaultDoc = json.default || json
  const text = defaultDoc.content.map(extractText).filter(Boolean).join('\n')

  await db.update(page).set({ text }).where(eq(page.id, entityId))
}
