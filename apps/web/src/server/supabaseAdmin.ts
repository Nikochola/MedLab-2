import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

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

loadMonorepoEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL). Set it in apps/web/.env.local or repo-root .env.local."
  )
}

if (!serviceRoleKey && !anonKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY. Set at least one key in apps/web/.env.local or repo-root .env.local."
  )
}

if (!serviceRoleKey) {
  console.warn(
    "[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key; privileged server operations may fail."
  )
}

export const hasSupabaseServiceRole = Boolean(serviceRoleKey)

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || anonKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
