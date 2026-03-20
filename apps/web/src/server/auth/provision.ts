import { randomUUID } from "crypto"

import { Pool } from "pg"

import type { PrimaryRole } from "@/lib/auth-utils"

const AUTH_INSTANCE_ID = "00000000-0000-0000-0000-000000000000"
const globalForAuthWritePool = globalThis as unknown as { authWritePool?: Pool }

function getAuthWriteDatabaseUrl() {
  return (
    process.env.BETTER_AUTH_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    null
  )
}

function normalizeDatabaseUrlForPg(input: string) {
  try {
    const parsed = new URL(input)
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

function getAuthWritePool() {
  const databaseUrl = getAuthWriteDatabaseUrl()
  if (!databaseUrl) {
    throw new Error("Missing database connection string for auth writes.")
  }

  if (!globalForAuthWritePool.authWritePool) {
    const normalizedUrl = normalizeDatabaseUrlForPg(databaseUrl)
    globalForAuthWritePool.authWritePool = new Pool({
      connectionString: normalizedUrl,
      ssl: normalizedUrl.includes("localhost") ? undefined : { rejectUnauthorized: false }
    })
  }

  return globalForAuthWritePool.authWritePool
}

export class AuthAccountExistsError extends Error {
  constructor() {
    super("An account with this email already exists.")
    this.name = "AuthAccountExistsError"
  }
}

export async function provisionPasswordAuthUser(input: {
  email: string
  password: string
  name: string
  primaryRole: PrimaryRole
  allowExisting?: boolean
}) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const password = input.password

  if (!email || !name || !password) {
    throw new Error("Name, email, and password are required.")
  }

  const pool = getAuthWritePool()
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const existingUser = await client.query<{ id: string }>(
      `
      select id
      from auth.users
      where lower(email) = $1::text
        and deleted_at is null
      limit 1
      `,
      [email]
    )

    const userId = existingUser.rows[0]?.id ?? randomUUID()
    const appMetadata = JSON.stringify({ provider: "email", providers: ["email"] })
    const userMetadata = JSON.stringify({ full_name: name, primary_role: input.primaryRole })

    if (existingUser.rowCount && !input.allowExisting) {
      throw new AuthAccountExistsError()
    }

    if (existingUser.rowCount) {
      await client.query(
        `
        update auth.users
        set
            encrypted_password = crypt($1::text, gen_salt('bf')),
            raw_app_meta_data = $2::jsonb,
            raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $3::jsonb,
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
        where id = $4::uuid
        `,
        [password, appMetadata, userMetadata, userId]
      )
    } else {
      await client.query(
        `
        insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        values (
            $1::uuid,
            $2::uuid,
            'authenticated',
            'authenticated',
            $3::text,
            crypt($4::text, gen_salt('bf')),
            now(),
            $5::jsonb,
            $6::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
        )
        `,
        [AUTH_INSTANCE_ID, userId, email, password, appMetadata, userMetadata]
      )
    }

    await client.query(
      `
      insert into auth.identities (
          provider_id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
      )
      values (
          $1::text,
          $2::uuid,
          jsonb_build_object(
              'sub', $3::text,
              'email', $4::text,
              'email_verified', true
          ),
          'email',
          now(),
          now(),
          now()
      )
      on conflict (provider_id, provider) do update
      set
          user_id = excluded.user_id,
          identity_data = excluded.identity_data,
          updated_at = now()
      `,
      [email, userId, userId, email]
    )

    await client.query(
      `
      insert into public.profiles (id, email, full_name, primary_role)
      values ($1::uuid, $2::text, $3::text, $4::user_primary_role)
      on conflict (id) do update
      set
          email = excluded.email,
          full_name = excluded.full_name,
          primary_role = excluded.primary_role
      `,
      [userId, email, name, input.primaryRole]
    )

    await client.query("COMMIT")
    return { userId, email }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
