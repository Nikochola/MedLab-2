import crypto from "crypto"
import fs from "fs"
import path from "path"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"
import { getInstitutionAppOrigin, getMarketingOrigin, getStudentAppOrigin } from "@/lib/runtimeUrls"

let envLoaded = false

function loadMonorepoEnv(): void {
  if (envLoaded) return
  envLoaded = true

  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env.local"),
    path.resolve(process.cwd(), "../../.env")
  ]

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue

    const content = fs.readFileSync(filePath, "utf8")
    const lines = content.split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue

      const key = match[1]
      if (!key || process.env[key] !== undefined) continue

      let value = match[2] ?? ""
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  }
}

function buildDatabaseUrlFromPooler() {
  const poolerFromEnv = process.env.SUPABASE_POOLER_URL

  const poolerFromTemp = (() => {
    const tempPath = path.resolve(process.cwd(), "../../supabase/.temp/pooler-url")
    if (!fs.existsSync(tempPath)) return null
    const raw = fs.readFileSync(tempPath, "utf8").trim()
    return raw || null
  })()

  const poolerUrl = poolerFromEnv || poolerFromTemp
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (!poolerUrl || !dbPassword) {
    return null
  }

  try {
    const parsed = new URL(poolerUrl)
    parsed.password = dbPassword
    parsed.searchParams.set("sslmode", "require")
    return parsed.toString()
  } catch {
    return null
  }
}

function normalizeDatabaseUrlForNodePg(input: string) {
  try {
    const parsed = new URL(input)

    // Supabase pooler works with pg when SSL is configured via the Pool options.
    // Leaving sslmode=require in the URI can cause pg to verify the chain and fail
    // against the pooler's certificate bundle in local development.
    if (parsed.hostname.includes("pooler.supabase.com")) {
      parsed.searchParams.delete("sslmode")
      parsed.searchParams.delete("sslcert")
      parsed.searchParams.delete("sslkey")
      parsed.searchParams.delete("sslrootcert")
    }

    return parsed.toString()
  } catch {
    return input
  }
}

loadMonorepoEnv()

const databaseUrl =
  process.env.BETTER_AUTH_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  buildDatabaseUrlFromPooler()

const appUrl = getInstitutionAppOrigin()
const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "medlab-dev-secret"

const trustedOrigins = [
  getInstitutionAppOrigin(),
  getMarketingOrigin(),
  getStudentAppOrigin(),
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
  process.env.NEXT_PUBLIC_MARKETING_URL,
  process.env.MARKETING_URL,
  process.env.NEXT_PUBLIC_STUDENT_APP_URL,
  process.env.STUDENT_APP_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001"
].filter((value): value is string => Boolean(value))

const missingDatabaseUrlMessage =
  "Missing BETTER_AUTH_DATABASE_URL (or DATABASE_URL / SUPABASE_DB_URL / POSTGRES_URL). You can also set SUPABASE_DB_PASSWORD + SUPABASE_POOLER_URL for automatic assembly."

const globalForPool = globalThis as unknown as { authPool?: Pool }

function createFallbackAuth() {
  console.warn(`[auth] ${missingDatabaseUrlMessage}`)

  return {
    api: {
      async getSession() {
        return null
      }
    },
    async handler() {
      return new Response(JSON.stringify({ error: missingDatabaseUrlMessage }), {
        status: 500,
        headers: { "content-type": "application/json" }
      })
    }
  }
}

function createConfiguredAuth() {
  if (!databaseUrl) {
    return createFallbackAuth()
  }

  const normalizedDatabaseUrl = normalizeDatabaseUrlForNodePg(databaseUrl)

  const authPool =
    globalForPool.authPool ||
    new Pool({
      connectionString: normalizedDatabaseUrl,
      ssl: normalizedDatabaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false }
    })

  if (process.env.NODE_ENV !== "production") {
    globalForPool.authPool = authPool
  }

  return betterAuth({
    appName: "MedLab",
    baseURL: appUrl,
    basePath: "/api/auth",
    secret,
    trustedOrigins,
    database: authPool,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    user: {
      modelName: "auth_users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    },
    session: {
      modelName: "auth_sessions",
      fields: {
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    },
    account: {
      modelName: "auth_accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    },
    verification: {
      modelName: "auth_verifications",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    },
    plugins: [nextCookies()],
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      }
    }
  })
}

export const auth = createConfiguredAuth() as any

export type AuthSession = unknown
