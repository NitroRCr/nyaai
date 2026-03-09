import { addMonths } from 'date-fns'
import { workspace } from '../schema'
import { db } from '../utils/db'
import { eq } from 'drizzle-orm'
import { DEFAULT_PLAN_ID } from 'app/src-shared/utils/config'

export async function resetQuota() {
  await db.transaction(async tx => {
    const workspaces = await tx.query.workspace.findMany({
      where: {
        resetAt: { lte: new Date() },
      },
    })
    for (const ws of workspaces) {
      const resetAt = addMonths(ws.resetAt, 1)
      if (ws.remainingMonths == null) {
        await tx.update(workspace).set({
          quotaUsed: 0,
          resetAt,
        }).where(eq(workspace.id, ws.id))
      } else if (ws.remainingMonths === 0) {
        await tx.update(workspace).set({
          quotaUsed: 0,
          resetAt,
          planId: DEFAULT_PLAN_ID,
          remainingMonths: null,
        }).where(eq(workspace.id, ws.id))
      } else {
        await tx.update(workspace).set({
          quotaUsed: 0,
          resetAt,
          remainingMonths: ws.remainingMonths - 1,
        }).where(eq(workspace.id, ws.id))
      }
    }
  })
}
