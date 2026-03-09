import { Cron } from 'croner'
import { mergePatches } from './merge-patches'
import { resetQuota } from './reset-quota'
import { cleanBlobs } from './clean-blobs'

export function initJobs() {
  return {
    mergePatches: new Cron('0 */5 * * * *', { protect: true }, mergePatches),
    resetQuota: new Cron('10 */5 * * * *', { protect: true }, resetQuota),
    cleanBlobs: new Cron('20 0 * * * *', { protect: true }, cleanBlobs),
  }
}
