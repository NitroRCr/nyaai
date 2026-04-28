import { defineMutator, defineMutators } from '@rocicorp/zero'
import { insertSchema, mutators } from 'app/src-shared/mutators'
import { schema } from 'app/src-shared/schema.gen'
import { updatePageText } from '../utils/page-text'

export const serverMutators = defineMutators(mutators, {
  createPagePatch: defineMutator(
    insertSchema(schema.tables.pagePatch),

    async ({ tx, ctx, args: { id, entityId, patch } }) => {
      await mutators.createPagePatch.fn({ tx, ctx, args: { id, entityId, patch } })
      updatePageText(entityId)
    },
  ),
})
