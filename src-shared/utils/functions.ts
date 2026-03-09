import type { Row } from '@rocicorp/zero'
import type { Avatar, EntityType, PaymentProvider } from './validators'
import type { IHasher } from 'hash-wasm'
import { BLOB_PROOF_PREFIX, BLOB_PROOF_SIZE } from './config'

export function assert(condition: any, message?: string): asserts condition {
  if (!condition) throw new Error(message ?? 'Assertion failed')
}

export function expandMessageTree(chat: Row['chat'], root: string): string[] {
  return [root, ...chat.msgTree[root].flatMap(id => expandMessageTree(chat, id))]
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8Array))
}
export function base64ToHex(base64: string) {
  return Array.from(atob(base64), c => c.charCodeAt(0)).map(x => x.toString(16).padStart(2, '0')).join('')
}

export function typeAvatar(type: EntityType): Avatar | undefined {
  if (type === 'folder') return { type: 'icon', icon: 'sym_o_folder' }
  if (type === 'search') return { type: 'icon', icon: 'sym_o_search' }
  if (type === 'chat') return { type: 'icon', icon: 'sym_o_chat' }
  if (type === 'page') return { type: 'icon', icon: 'sym_o_article' }
  if (type === 'translation') return { type: 'icon', icon: 'sym_o_translate' }
  if (type === 'channel') return { type: 'icon', icon: 'sym_o_tag' }
  if (type === 'provider') return { type: 'icon', icon: 'sym_o_dns' }
  if (type === 'shortcut') return { type: 'icon', icon: 'sym_o_arrow_outward' }
  if (type === 'assistant') return { type: 'icon', icon: 'sym_o_robot_2' }
  if (type === 'item') return { type: 'icon', icon: 'sym_o_description' }
  if (type === 'mcpPlugin') return { type: 'icon', icon: 'sym_o_extension' }
}

export async function hashStream(hasher: IHasher | Bun.CryptoHasher, stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    hasher.update(value)
  }
  return hasher
}

export async function hashProofStream(hasher: IHasher | Bun.CryptoHasher, stream: ReadableStream<Uint8Array>) {
  hasher.update(BLOB_PROOF_PREFIX)
  const reader = stream.getReader()
  let remaining = BLOB_PROOF_SIZE
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = value.subarray(0, remaining)
    hasher.update(chunk)
    remaining -= chunk.length
    if (remaining <= 0) {
      await reader.cancel()
      break
    }
  }
  return hasher
}

export function timeMs(time: string) {
  const unit = time.at(-1)!
  const value = +time.slice(0, -1)
  if (unit === 's') return value * 1000
  if (unit === 'm') return value * 60 * 1000
  if (unit === 'h') return value * 60 * 60 * 1000
  if (unit === 'd') return value * 24 * 60 * 60 * 1000
  if (unit === 'w') return value * 7 * 24 * 60 * 60 * 1000
  if (unit === 'M') return value * 30 * 24 * 60 * 60 * 1000
  if (unit === 'y') return value * 365 * 24 * 60 * 60 * 1000
  return NaN
}

export function sizeBytes(size: string) {
  const unit = size.at(-1)!.toUpperCase()
  const value = +size.slice(0, -1)
  if (unit === 'B') return value
  if (unit === 'K') return value * 1024
  if (unit === 'M') return value * (1024 ** 2)
  if (unit === 'G') return value * (1024 ** 3)
  if (unit === 'T') return value * (1024 ** 4)
  if (unit === 'P') return value * (1024 ** 5)
  return NaN
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]) {
  return Object.fromEntries(keys.map(key => [key, obj[key]])) as Pick<T, K>
}

export function diff<T extends object>(from: T, to: T) {
  return Object.keys(from).reduce((acc, key) => {
    if (from[key] !== to[key]) acc[key] = to[key]
    return acc
  }, {} as Partial<T>)
}

export function currencyPrefix(provider: PaymentProvider) {
  return provider === 'wxpay' ? '¥' : '$'
}
