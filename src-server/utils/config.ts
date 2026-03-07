export const FRONT_URL = process.env.FRONT_URL!
export const ADMIN_URL = process.env.ADMIN_URL!
export const DATABASE_URL = process.env.DATABASE_URL!
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const S3_ENDPOINT = process.env.S3_ENDPOINT!
export const S3_REGION = process.env.S3_REGION!
export const S3_BUCKET = process.env.S3_BUCKET!
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID!
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY!
export const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env
export const { SMTP_USER, SMTP_PASSWORD, SMTP_HOST, SMTP_FROM } = process.env
export const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined
export const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
export const SITE_NAME = process.env.SITE_NAME!
export const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
export const WXPAY_PID = process.env.WXPAY_PID
export const WXPAY_KEY = process.env.WXPAY_KEY
export const WXPAY_URL = process.env.WXPAY_URL
