import { mergePatchesRule, pagePatch } from 'app/src-server/schema'
import { db } from 'app/src-server/utils/db'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { idTimestamp, timestampHash } from '../../src-shared/utils/id'
import * as Y from 'yjs'
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../src-shared/utils/functions'

export async function mergePatches() {
  const rules = await db.select().from(mergePatchesRule)
  for (const { id, offset, interval, gap, lastTime } of rules) {
    let time = lastTime
    while (true) {
      time += interval
      if (Date.now() <= time) break
      await runMerge({ offset, interval, gap, time })
      await db.update(mergePatchesRule)
        .set({ lastTime: time })
        .where(eq(mergePatchesRule.id, id))
    }
  }
}

async function runMerge({ offset, interval, gap, time }: {
  offset: number
  interval: number
  gap: number
  time: number
}) {
  const end = time - offset
  const start = end - interval
  const timeRange = sql`${pagePatch.id} >= ${timestampHash(start)} AND ${pagePatch.id} < ${timestampHash(end + gap)}`
  const ids = await db.selectDistinct({ entityId: pagePatch.entityId }).from(pagePatch).where(timeRange)
  for (const { entityId } of ids) {
    const patches = (await db.select().from(pagePatch)
      .where(and(timeRange, eq(pagePatch.entityId, entityId)))
      .orderBy(asc(pagePatch.id)))
      .map(p => ({ ...p, timestamp: idTimestamp(p.id) }))
    if (patches.length <= 1) continue
    if (patches.at(-1)!.timestamp >= end) {
      const mergeList = [patches.pop()!]
      while (patches.length && mergeList[0].timestamp - patches.at(-1)!.timestamp < gap) {
        mergeList.unshift(patches.pop()!)
      }
      await merge(mergeList)
    }
    await merge(patches)
  }
}

async function merge(patches: { id: string, patch: string }[]) {
  if (patches.length <= 1) return
  const ydoc = new Y.Doc()
  for (const { patch } of patches) Y.applyUpdateV2(ydoc, base64ToUint8Array(patch))
  const patch = uint8ArrayToBase64(Y.encodeStateAsUpdateV2(ydoc))
  const { id } = patches.pop()!
  await db.transaction(async tx => {
    await tx.update(pagePatch).set({ patch }).where(eq(pagePatch.id, id))
    await tx.delete(pagePatch).where(inArray(pagePatch.id, patches.map(p => p.id)))
  })
}
