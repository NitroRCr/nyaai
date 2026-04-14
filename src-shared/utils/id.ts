const SAFE64_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'
function int32ToSafe64(int32: number, length: number) {
  return Array
    .from({ length }, (_, i) => SAFE64_CHARS[(int32 >>> ((length - 1 - i) * 6)) & 0x3f])
    .join('')
}
function safe64ToInt32(safe64: string) {
  return Array
    .from(safe64, (c, i) => SAFE64_CHARS.indexOf(c) << ((safe64.length - 1 - i) * 6))
    .reduce((acc, curr) => acc | curr, 0)
}

let lastTimestamp = 0
let count = 0
function randomInt32() {
  return crypto.getRandomValues(new Int32Array(1))[0]
}
function refreshCount() {
  count = randomInt32() >>> 3
}
export function timestampHash(timestamp: number) {
  return int32ToSafe64(timestamp / (1 << 30) | 0, 2) + int32ToSafe64(timestamp, 5)
}
export function genId(timestamp = Date.now()) {
  if (timestamp === lastTimestamp) {
    count++
  } else {
    refreshCount()
    lastTimestamp = timestamp
  }
  const timeHash = timestampHash(timestamp)
  const countHash = int32ToSafe64(count, 5)
  const randomHash = int32ToSafe64(randomInt32(), 4)
  return timeHash + countHash + randomHash
}
export function genIds(n: number) {
  return Array.from({ length: n }, genId)
}
export function idTimestamp(id: string) {
  return safe64ToInt32(id.slice(0, 2)) * (1 << 30) + safe64ToInt32(id.slice(2, 7))
}
export function idDateString(id: string) {
  return new Date(idTimestamp(id)).toLocaleString()
}
export function randomId(length = 16) {
  return Array.from({ length }, () => SAFE64_CHARS[crypto.getRandomValues(new Uint8Array(1))[0] >>> 2]).join('')
}
