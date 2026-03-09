import { AwsClient } from 'aws4fetch'
import { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } from './config'

const aws = new AwsClient({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
})

function objectUrl(key: string) {
  return `https://${S3_BUCKET}.${S3_ENDPOINT}/${key}`
}

export async function presignedGetObject(key: string, { expires, contentDisposition }: {
  expires: number
  contentDisposition?: string
}) {
  const url = new URL(objectUrl(key))
  url.searchParams.set('X-Amz-Expires', expires.toString())
  if (contentDisposition) url.searchParams.set('response-content-disposition', contentDisposition)

  const signed = await aws.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true },
  })
  return signed.url
}

export async function putObject(key: string, body: BodyInit, { size, metadata }: {
  size: number
  metadata?: Record<string, string>
}) {
  const res = await aws.fetch(objectUrl(key), {
    method: 'PUT',
    body,
    headers: {
      'content-length': size.toString(),
      ...metadata,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    const codeMatch = text.match(/<Code>(.+?)<\/Code>/)
    throw Object.assign(new Error('S3 putObject failed'), { code: codeMatch?.[1] })
  }
}

export async function deleteObject(key: string) {
  const res = await aws.fetch(objectUrl(key), { method: 'DELETE' })
  if (!res.ok) throw new Error(`S3 deleteObject failed: ${res.status}`)
}
