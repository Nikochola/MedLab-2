import { NextResponse } from "next/server"

import { ensureAppUser, resolveRoleForUser, type AppRole } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export type MobileUserContext = {
  token: string
  user: {
    id: string
    email: string
    name?: string | null
  }
  appUser: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
  role: AppRole
  memberships: Array<{ role: string | null; status: string | null; institution_id?: string | null }>
  profile: {
    id: string
    email: string | null
    full_name: string | null
    name?: string | null
    primary_role?: string | null
    avatar_url?: string | null
    avatar_config?: Record<string, unknown> | null
    created_at?: string | null
  } | null
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function unauthorizedMobileResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function requireMobileUser(request: Request): Promise<MobileUserContext | NextResponse> {
  const token = bearerToken(request)
  if (!token) return unauthorizedMobileResponse()

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  const authUser = data?.user

  if (error || !authUser?.id || !authUser.email) {
    return unauthorizedMobileResponse()
  }

  const appUser = await ensureAppUser({
    user: {
      id: authUser.id,
      email: authUser.email,
      name:
        (authUser.user_metadata?.name as string | undefined) ||
        (authUser.user_metadata?.full_name as string | undefined) ||
        null,
      image: (authUser.user_metadata?.avatar_url as string | undefined) || null,
    },
  })

  if (!appUser) return unauthorizedMobileResponse()

  const [{ data: profile }, { data: memberships }, role] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,name,primary_role,avatar_url,avatar_config,created_at")
      .eq("id", authUser.id)
      .maybeSingle(),
    supabaseAdmin
      .from("institution_memberships")
      .select("role,status,institution_id")
      .eq("user_id", authUser.id),
    resolveRoleForUser(authUser.id),
  ])

  return {
    token,
    user: {
      id: authUser.id,
      email: authUser.email,
      name:
        (authUser.user_metadata?.name as string | undefined) ||
        (authUser.user_metadata?.full_name as string | undefined) ||
        null,
    },
    appUser,
    role,
    memberships: memberships || [],
    profile: profile || null,
  }
}

export function isMobileContext(value: MobileUserContext | NextResponse): value is MobileUserContext {
  return !(value instanceof NextResponse)
}
