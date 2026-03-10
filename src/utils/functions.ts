import { Hct, hexFromArgb } from '@material/material-color-utilities'
import type { FullEntity } from 'app/src-shared/queries'
import type { EntityType, WorkspaceRole } from 'app/src-shared/utils/validators'
import { t } from './i18n'
import { scaleImage } from './image-process'
import type { ShortcutKey } from './types'

export const pageFhStyle = (offset: number, height: number) => ({
  height: `${height - offset}px`,
  overflowY: 'auto',
})

export function hctToHex(h: number, c: number, t: number): string {
  return hexFromArgb(Hct.from(h, c, t).toInt())
}
export function wrapCode(code: string, lang = '', backticks = 3) {
  const mark = '`'.repeat(backticks)
  return `${mark}${lang}\n${code}\n${mark}`
}

export function arrayToMap<T>(array: ReadonlyArray<T>, key: (item: T) => string) {
  const map: Record<string, T> = Object.create(null)
  for (const item of array) {
    map[key(item)] = item
  }
  return map
}

export function * pairs<T>(array: T[]) {
  for (let i = 0; i < array.length - 1; i++) {
    yield [array[i], array[i + 1]] as const
  }
}

export function formatBytes(bytes: number) {
  for (const unit of ['B', 'KB', 'MB', 'GB', 'TB']) {
    if (bytes < 1024) return `${bytes.toFixed(1)} ${unit}`
    bytes /= 1024
  }
  return `${bytes.toFixed(1)} PB`
}

export function formatTimeBrief(ms: number) {
  const s = ms / 1000
  if (s < 60) return t('{0} seconds', s.toFixed(0))
  const m = s / 60
  if (m < 60) return t('{0} minutes', m.toFixed(0))
  const h = m / 60
  if (h < 24) return t('{0} hours', h.toFixed(0))
  const d = h / 24
  return t('{0} days', d.toFixed(0))
}

export function formatTime(seconds: number | null) {
  if (seconds === null) return ''
  seconds = Math.floor(seconds)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`
}

export function getItemUrl(id: string) {
  return `/api/s3/items/${id}`
}

export function entityRoute(type: EntityType, id: string, position: 'left' | 'right' = 'left') {
  return position === 'left' ? `/${type}/${id}` : { query: { rightEntity: JSON.stringify({ type, id }) } }
}

export function expandAncestors(entity: FullEntity, till?: string) {
  const res = [entity]
  entity.id !== till && entity.parent && res.unshift(...expandAncestors(entity.parent))
  return res
}

export function filterOptions<T>(options: T[], q: string, getLabel: (option: T) => string) {
  return options.filter(option => getLabel(option).toLowerCase().startsWith(q.toLowerCase())).concat(
    options.filter(option => getLabel(option).toLowerCase().includes(q.toLowerCase(), 1)),
  )
}

export function getFavicon(url: string) {
  return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`
}

export function mimeTypeMatch(mimeType: string, mimeTypes: string[]) {
  return mimeTypes.some(t => {
    if (t === '*' || t === mimeType) return true
    const [type, subtype] = t.split('/')
    if (!mimeType.startsWith(type + '/')) return false
    return subtype === '*'
  })
}

const cjkReg = /[\u4e00-\u9fa5\u0800-\u4e00\uac00-\ud7ff]/
export function textBeginning(text: string, length: number) {
  let res = ''
  for (const i of text) {
    res += i
    length -= cjkReg.test(i) ? 2 : 1
    if (length <= 0) return res + '…'
  }
  return res
}

export async function isTextFile(file: Blob) {
  if (file.size > 4 * 1024 * 1024) return false
  const array = new Uint8Array(await file.arrayBuffer())
  for (const byte of array) {
    // Allowed control characters:
    // 9  - Tab
    // 10 - Line feed (LF)
    // 13 - Carriage return (CR)
    // 12 - Form feed (FF)
    // 11 - Vertical tab (VT)
    if (byte < 32 && ![9, 10, 13, 12, 11].includes(byte)) {
      return false
    }
  }

  return true
}

/*
  cyrb53 (c) 2018 bryc (github.com/bryc)
  License: Public domain (or MIT if needed). Attribution appreciated.
  A fast and simple 53-bit string hash function with decent collision resistance.
  Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
export function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export function stringHue(str: string) {
  return cyrb53(str) % 360
}

export type SpliceListOptions<T = any> = {
  start?: T | null
  noMore?: boolean
}
export function spliceList<T>(
  list: T[],
  items: T[],
  orderBy: [keyof T, 'asc' | 'desc'][],
  { start = null, noMore = false }: SpliceListOptions<T> = {},
) {
  function before(a: T, b: T) {
    for (const [key, order] of orderBy) {
      if (a[key] < b[key]) return order === 'asc'
      if (a[key] > b[key]) return order === 'desc'
    }
    return false
  }
  let from = start ? list.findIndex(i => before(start, i)) : 0
  from = from !== -1 ? from : list.length
  let to = noMore ? list.length : list.findIndex(i => before(items[items.length - 1], i))
  to = to !== -1 ? to : list.length
  return list.splice(from, to - from, ...items)
}

export function invitationLink(token: string) {
  return `${location.origin}/invitations/${token}`
}

export function maskedInvitationLink(token: string) {
  return `${location.origin}/invitations/${token.slice(0, 4)}****`
}

export function roleText(role: WorkspaceRole) {
  if (role === 'owner') return t('Owner')
  if (role === 'admin') return t('Admin')
  if (role === 'member') return t('Member')
  if (role === 'guest') return t('Guest')
}

export async function scaleWhenNeeded(file: File) {
  if (!file.type.startsWith('image/') || file.size < 512 * 1024) return file
  return await scaleImage(file, 2048 * 2048)
}

export function getExt(filename: string) {
  return filename.includes('.') ? filename.split('.').pop() : undefined
}

export function shortcutKeyMatch(shortcut: ShortcutKey, ev: KeyboardEvent) {
  const { key, withCtrl = false, withShift = false, withAlt = false, withMeta = false } = shortcut
  return ev.code === key &&
    ev.ctrlKey === withCtrl &&
    ev.shiftKey === withShift &&
    ev.altKey === withAlt &&
    ev.metaKey === withMeta
}

function isObject(item: any) {
  return item instanceof Object && !Array.isArray(item)
}
export function mergeObjects(objects: object[], depth = 1) {
  const merged = {}
  for (const obj of objects) {
    for (const key in obj) {
      if (depth > 0 && isObject(obj[key]) && isObject(merged[key])) {
        merged[key] = mergeObjects([merged[key], obj[key]], depth - 1)
      } else {
        merged[key] = obj[key]
      }
    }
  }
  return merged
}
