import { blob } from 'app/src-server/schema'
import { db } from '../utils/db'
import { eq } from 'drizzle-orm'
import { deleteObject } from '../utils/s3'

export async function cleanBlobs() {
  const blobs = await db.query.blob.findMany({
    where: { refCount: 0 },
  })
  for (const { id } of blobs) {
    await deleteObject(id)
      .then(() => db.delete(blob).where(eq(blob.id, id)))
      .catch(err => console.error(`Failed to delete blob ${id} from S3:`, err))
  }
}
