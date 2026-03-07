import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { DATABASE_URL } from './config'
import { relations } from '../schema/relations'
import * as schema from '../schema'

export const db = drizzle(DATABASE_URL, { schema, relations })

if (process.argv.slice(2).includes('--migrate')) {
  await migrate(db, {
    migrationsFolder: 'drizzle',
  })
}
