import ky from 'ky'
import { debounce, Notify } from 'quasar'
import { MAX_SINGLE_CACHE_SIZE, MAX_TOTAL_CACHE_SIZE } from './config'
import { uploadBlob } from 'src/services/upload'
import { t } from 'src/utils/i18n'
import { client } from './hc'
import type { DBSchema } from 'idb'
import { openDB } from 'idb'
import { hashBlob } from './hash'
import { useWorkspaceStore } from 'src/stores/workspace'
import { formatBytes } from './functions'

interface BlobMeta {
  hash: string
  lastAccessed: number
  size: number
}

interface Schema extends DBSchema {
  blob: {
    key: string
    value: Blob
  }
  blobMeta: {
    key: string
    value: BlobMeta
  }
  itemHash: {
    key: string
    value: {
      id: string
      hash: string
    }
    indexes: {
      hash: string
    }
  }
}

const dbPromise = openDB<Schema>('blob-cache', 1, {
  upgrade(db) {
    db.createObjectStore('blob')
    db.createObjectStore('blobMeta', { keyPath: 'hash' })
    db.createObjectStore('itemHash', { keyPath: 'id' })
      .createIndex('hash', 'hash')
  },
})

const sessionBlobs = new Map<string, Blob>()

async function touchBlob(hash: string) {
  const db = await dbPromise
  const meta = await db.get('blobMeta', hash)
  if (!meta) return
  await db.put('blobMeta', {
    ...meta,
    lastAccessed: Date.now(),
  })
}

export async function getCached(id: string) {
  const db = await dbPromise
  const sessionCached = sessionBlobs.get(id)
  if (sessionCached) return sessionCached
  const itemHash = await db.get('itemHash', id)
  if (itemHash) {
    await touchBlob(itemHash.hash)
    return await db.get('blob', itemHash.hash)
  }
}
export async function getDownloadUrl(id: string) {
  const res = await client.api.s3.items[':id'].url.$get({ param: { id } })
  const data = await res.json()
  if ('error' in data) throw new Error(data.error)
  return data
}
export async function getBlob(id: string) {
  const cached = await getCached(id)
  if (cached) return cached
  const { url, sha256 } = await getDownloadUrl(id)
  const blob = await ky.get(url).blob()
  if (await hashBlob(blob) !== sha256) throw new Error('Blob hash mismatch')
  await cacheBlob(id, sha256, blob)
  return blob
}
export async function getBufferOrURL(id: string) {
  const cached = await getCached(id)
  if (cached) return await cached.arrayBuffer()
  const { url } = await getDownloadUrl(id)
  return new URL(url)
}
export async function cacheBlob(id: string, hash: string, blob: Blob) {
  if (blob.size > MAX_SINGLE_CACHE_SIZE) return
  const db = await dbPromise
  const tx = db.transaction(['blob', 'blobMeta', 'itemHash'], 'readwrite')
  tx.objectStore('blob').put(blob, hash)
  tx.objectStore('blobMeta').put({ hash, lastAccessed: Date.now(), size: blob.size })
  tx.objectStore('itemHash').put({ id, hash })
  await tx.done
  debounce(trimCache, 1000)
}
function weight(meta: BlobMeta) {
  return Math.log(Date.now() - meta.lastAccessed) + 0.5 * Math.log(meta.size)
}
async function trimCache() {
  const db = await dbPromise
  const tx = db.transaction(['blob', 'blobMeta', 'itemHash'], 'readwrite')
  const blobStore = tx.objectStore('blob')
  const metaStore = tx.objectStore('blobMeta')
  const itemHashStore = tx.objectStore('itemHash')
  const metas = await metaStore.getAll()
  metas.sort((a, b) => weight(b) - weight(a))
  let totalSize = metas.reduce((acc, m) => acc + m.size, 0)
  for (const m of metas) {
    if (totalSize <= MAX_TOTAL_CACHE_SIZE) break
    const itemKeys = await itemHashStore.index('hash').getAllKeys(m.hash)
    for (const key of itemKeys) await itemHashStore.delete(key)
    await blobStore.delete(m.hash)
    await metaStore.delete(m.hash)
    totalSize -= m.size
  }
  await tx.done
}

export async function upload(id: string, blob: Blob, name: string, wait?: Promise<any>) {
  const workspaceStore = useWorkspaceStore()
  const limit = workspaceStore.workspace?.plan?.fileSizeLimit
  if (limit && blob.size > limit) {
    Notify.create({
      message: t('Max file size for your current plan is {0}.', formatBytes(limit)),
    })
    throw new Error('File size exceeds limit')
  }
  sessionBlobs.set(id, blob)
  const sha256 = await uploadBlob({
    id,
    title: t('Upload: {0}', name),
  }, id, blob, wait).promise
  await cacheBlob(id, sha256, blob)
}
