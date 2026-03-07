import ky from 'ky'
import { FRONT_URL, WXPAY_KEY, WXPAY_PID, WXPAY_URL } from './config'

export function getSign(paraList: Record<string, string>): string {
  const paraFilter: Record<string, string> = {}

  for (const [k, v] of Object.entries(paraList)) {
    if (k === 'sign' || k === 'sign_type' || !v) {
      continue
    }
    paraFilter[k] = v
  }

  const sortedKeys = Object.keys(paraFilter).sort()
  const paraStr = sortedKeys
    .map((key) => `${key}=${paraFilter[key]}`)
    .join('&')
  const signStr = paraStr + WXPAY_KEY

  const hasher = new Bun.CryptoHasher('md5')
  hasher.update(signStr)
  return hasher.digest('hex')
}

interface PayParams {
  type: 'wxpay'
  return_url: string
  out_trade_no: string
  name: string
  money: string
}

export async function wxpayCheckout(params: PayParams): Promise<string> {
  const requestParams = {
    ...params,
    pid: WXPAY_PID!,
    notify_url: `${FRONT_URL}/api/webhooks/wxpay`,
    device: 'jump',
    clientip: '192.168.1.100',
  }

  requestParams['sign'] = getSign(requestParams)
  requestParams['sign_type'] = 'MD5'

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(requestParams)) {
    if (value !== undefined) {
      searchParams.append(key, String(value))
    }
  }

  interface ApiResponse {
    code: number
    msg: string
    payurl: string
  }

  const responseBody: ApiResponse = await ky.post(WXPAY_URL!, {
    body: searchParams,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).json()

  if (responseBody.code !== 1) {
    throw new Error(`code: ${responseBody.code}, msg: ${responseBody.msg}`)
  }

  return responseBody.payurl
}
