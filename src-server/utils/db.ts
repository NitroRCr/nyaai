import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import { DATABASE_URL } from './config'
import { relations } from '../schema/relations'
import * as schema from '../schema'

export const db = drizzle({
  connection: {
    url: DATABASE_URL,
    prepare: false,
  },
  schema,
  relations,
})

await migrate(db, {
  migrationsFolder: 'drizzle',
})
