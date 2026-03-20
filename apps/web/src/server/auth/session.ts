import { cookies, headers } from "next/headers"

import { LEGACY_AUTH_ACCESS_COOKIE } from "@/lib/auth-cookies"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { hasSupabaseServiceRole, supabaseAdmin } from "@/server/supabaseAdmin"
import { auth } from "@/server/auth/auth"

export type AppRole = "institution_admin" | "educator" | "student"

type SessionUser = {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

type SessionData = {
  user?: SessionUser | null
}

export type SessionWithRole = {
  session: {
    user: SessionUser
  }
  role: AppRole
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function legacyAliasEmail(email: string, legacyUserId: string) {
  const base = email.split("@")[0] || "user"
  const short = legacyUserId.replace(/-/g, "").slice(0, 12)
  return `${base}+legacy-${short}@legacy.medlab.invalid`
}

async function safeUpdateTable(table: string, column: string, fromId: string, toId: string) {
  try {
    const { error } = await supabaseAdmin.from(table).update({ [column]: toId }).eq(column, fromId)
    if (error) {
      const ignorable =
        error.message.includes("relation") ||
        error.message.includes("column") ||
        error.message.includes("does not exist")

      if (!ignorable) {
        console.warn(`[auth] Failed to migrate ${table}.${column}: ${error.message}`)
      }
    }
  } catch (error) {
    console.warn(`[auth] Failed to migrate ${table}.${column}: ${error instanceof Error ? error.message : "unknown"}`)
  }
}

async function migrateMembershipTable(table: "institution_memberships" | "course_memberships", legacyUserId: string, canonicalUserId: string) {
  const { data: legacyRows, error: selectError } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("user_id", legacyUserId)

  if (selectError) {
    throw new Error(`Failed to read legacy ${table}: ${selectError.message}`)
  }

  if (!legacyRows?.length) {
    return
  }

  const remappedRows = legacyRows.map((row: Record<string, any>) => {
    const cloned = { ...row }
    delete cloned.id
    cloned.user_id = canonicalUserId
    return cloned
  })

  const { error: upsertError } = await supabaseAdmin.from(table).upsert(remappedRows, {
    onConflict: table === "institution_memberships" ? "institution_id,user_id" : "course_id,user_id"
  })

  if (upsertError) {
    throw new Error(`Failed to upsert canonical ${table}: ${upsertError.message}`)
  }

  const { error: deleteError } = await supabaseAdmin.from(table).delete().eq("user_id", legacyUserId)
  if (deleteError) {
    throw new Error(`Failed to remove legacy ${table}: ${deleteError.message}`)
  }
}

async function reconcileLegacyUserByEmail(input: {
  canonicalUserId: string
  canonicalEmail: string
}) {
  if (!hasSupabaseServiceRole) {
    return
  }

  const { data: emailOwner, error: emailOwnerError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,full_name")
    .eq("email", input.canonicalEmail)
    .maybeSingle()

  if (emailOwnerError) {
    throw new Error(`Failed to resolve profile by email: ${emailOwnerError.message}`)
  }

  if (!emailOwner || emailOwner.id === input.canonicalUserId) {
    return
  }

  const legacyUserId = String(emailOwner.id)
  const alias = legacyAliasEmail(input.canonicalEmail, legacyUserId)

  const { error: aliasError } = await supabaseAdmin
    .from("profiles")
    .update({ email: alias })
    .eq("id", legacyUserId)

  if (aliasError) {
    throw new Error(`Failed to reserve canonical email during reconciliation: ${aliasError.message}`)
  }

  await migrateMembershipTable("institution_memberships", legacyUserId, input.canonicalUserId)
  await migrateMembershipTable("course_memberships", legacyUserId, input.canonicalUserId)

  await safeUpdateTable("invites", "created_by_user_id", legacyUserId, input.canonicalUserId)
  await safeUpdateTable("case_attempts", "user_id", legacyUserId, input.canonicalUserId)
  await safeUpdateTable("subscriptions", "user_id", legacyUserId, input.canonicalUserId)
  await safeUpdateTable("usage_limits", "user_id", legacyUserId, input.canonicalUserId)
  await safeUpdateTable("student_progress", "student_id", legacyUserId, input.canonicalUserId)
  await safeUpdateTable("student_activities", "student_id", legacyUserId, input.canonicalUserId)

  try {
    await supabaseAdmin.from("user_identities").upsert(
      {
        canonical_user_id: input.canonicalUserId,
        legacy_user_id: legacyUserId,
        email: input.canonicalEmail
      },
      { onConflict: "legacy_user_id" }
    )
  } catch {
    // user_identities table is optional for backward compatibility.
  }
}

async function getLegacySessionFromCookie(): Promise<SessionData | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(LEGACY_AUTH_ACCESS_COOKIE)?.value

  if (!token) {
    return null
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user?.id || !data.user.email) {
    return null
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      name:
        (data.user.user_metadata?.name as string | undefined) ||
        (data.user.user_metadata?.full_name as string | undefined) ||
        null,
      image: null
    }
  }
}

async function getSupabaseSessionFromCookies(): Promise<SessionData | null> {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user?.id || !user.email) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name:
          (user.user_metadata?.name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          null,
        image: null
      }
    }
  } catch {
    return null
  }
}

export async function getServerSession() {
  try {
    const requestHeaders = new Headers(await headers())
    const betterAuthSession = (await auth.api.getSession({ headers: requestHeaders })) as SessionData | null

    if (betterAuthSession?.user?.id && betterAuthSession.user.email) {
      return betterAuthSession
    }
  } catch {
    // Fallback to legacy cookie session below.
  }

  const supabaseSession = await getSupabaseSessionFromCookies()
  if (supabaseSession?.user?.id && supabaseSession.user.email) {
    return supabaseSession
  }

  return await getLegacySessionFromCookie()
}

export async function ensureAppUser(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.id || !session.user.email) {
    return null
  }

  const userId = session.user.id
  const email = normalizeEmail(session.user.email)
  const name = (session.user.name || null) as string | null
  const avatarUrl = (session.user.image || null) as string | null

  if (!hasSupabaseServiceRole) {
    return { id: userId, email, name, avatarUrl }
  }

  await reconcileLegacyUserByEmail({
    canonicalUserId: userId,
    canonicalEmail: email
  })

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: name
    },
    { onConflict: "id" }
  )

  if (error) {
    throw new Error(`Failed to provision app user: ${error.message}`)
  }

  return { id: userId, email, name, avatarUrl }
}

export async function getMembershipLookupUserIds(canonicalUserId: string) {
  if (!hasSupabaseServiceRole) {
    return [canonicalUserId]
  }

  const ids = new Set<string>([canonicalUserId])

  try {
    const { data, error } = await supabaseAdmin
      .from("user_identities")
      .select("legacy_user_id")
      .eq("canonical_user_id", canonicalUserId)

    if (!error) {
      for (const row of data || []) {
        if (row.legacy_user_id) {
          ids.add(String(row.legacy_user_id))
        }
      }
    }
  } catch {
    // Mapping table is optional.
  }

  return Array.from(ids)
}

export async function resolveRoleForUser(userId: string): Promise<AppRole> {
  if (!hasSupabaseServiceRole) {
    return "student"
  }

  const lookupIds = await getMembershipLookupUserIds(userId)

  const { data, error } = await supabaseAdmin
    .from("institution_memberships")
    .select("role,status")
    .in("user_id", lookupIds)
    .eq("status", "ACTIVE")

  if (error) {
    throw new Error(`Failed to resolve role: ${error.message}`)
  }

  const roles = new Set((data || []).map((row: { role: string }) => row.role.toLowerCase()))

  if (roles.has("institution_admin") || roles.has("admin")) {
    return "institution_admin"
  }

  if (roles.has("educator") || roles.has("teacher")) {
    return "educator"
  }

  return "student"
}

export function redirectPathForRole(role: AppRole) {
  if (role === "institution_admin" || role === "educator") {
    return "/institution/courses"
  }

  return "/learn"
}

export async function needsOnboarding(userId: string) {
  if (!hasSupabaseServiceRole) {
    return false
  }

  const lookupIds = await getMembershipLookupUserIds(userId)

  const { count, error } = await supabaseAdmin
    .from("institution_memberships")
    .select("id", { head: true, count: "exact" })
    .in("user_id", lookupIds)
    .eq("status", "ACTIVE")

  if (error) {
    throw new Error(`Failed to determine onboarding status: ${error.message}`)
  }

  return (count || 0) === 0
}

export async function getSessionWithRole(): Promise<SessionWithRole | null> {
  const session = await getServerSession()

  if (!session?.user?.id || !session.user.email) {
    return null
  }

  const normalizedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || null,
      image: session.user.image || null
    }
  }

  try {
    await ensureAppUser(normalizedSession)
    const role = await resolveRoleForUser(normalizedSession.user.id)

    return {
      session: normalizedSession,
      role
    }
  } catch (error) {
    console.warn(
      `[auth] Falling back to student role for ${normalizedSession.user.email}: ${error instanceof Error ? error.message : "unknown error"
      }`
    )
  }

  return {
    session: normalizedSession,
    role: "student"
  }
}
