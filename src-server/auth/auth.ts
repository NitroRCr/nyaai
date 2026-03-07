import type { BetterAuthOptions } from 'better-auth/minimal'
import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, twoFactor } from 'better-auth/plugins'
import { db } from '../utils/db'
import { afterHooks } from './hooks'
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  REQUIRE_EMAIL_VERIFICATION,
  SITE_NAME,
  FRONT_URL,
  ADMIN_URL,
} from '../utils/config'
import { sendResetPassword, sendVerificationEmail } from './smtp'
import { genId } from 'app/src-shared/utils/id'

const socialProviders: BetterAuthOptions['socialProviders'] = {}
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  }
}
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
  }
}

export const auth = betterAuth({
  appName: SITE_NAME,
  baseURL: FRONT_URL,
  trustedOrigins: [FRONT_URL, ADMIN_URL],
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: password => Bun.password.hash(password, {
        algorithm: 'argon2id',
        memoryCost: 20480,
        timeCost: 2,
      }),
      verify: ({ password, hash }) => Bun.password.verify(password, hash),
    },
    sendResetPassword: ({ user, url }) => sendResetPassword(user, url),
    requireEmailVerification: REQUIRE_EMAIL_VERIFICATION,
  },
  experimental: {
    joins: false, // TODO: enable when supports
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },
  plugins: [admin(), twoFactor()],
  hooks: {
    after: afterHooks,
  },
  socialProviders,
  emailVerification: {
    sendVerificationEmail: ({ user, url }) => sendVerificationEmail(user, url),
  },
  rateLimit: {
    enabled: true,
    customRules: {
      '/send-verification-email': {
        window: 30,
        max: 1,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => genId(),
    },
  },
})
