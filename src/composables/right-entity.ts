import { entityTypeSchema } from 'app/src-shared/utils/validators'
import { useJsonQuery } from './json-query'
import { z } from 'zod'

export function useRightEntity() {
  return useJsonQuery('rightEntity', z.object({
    type: entityTypeSchema,
    id: z.string(),
  }))
}
