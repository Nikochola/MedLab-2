import { NextRequest, NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { getInstitutionAppOrigin, getStudentAppOrigin } from "@/lib/runtimeUrls"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"

function resolveSafeRedirectUrl(request: NextRequest, next: string | null) {
  if (!next) return null

  if (next.startsWith("/") && !next.startsWith("//")) {
    return new URL(next, request.url)
  }

  try {
    const url = new URL(next)
    const trustedOrigins = new Set([
      request.nextUrl.origin,
      getInstitutionAppOrigin(),
      getStudentAppOrigin(),
    ])

    return trustedOrigins.has(url.origin) ? url : null
  } catch {
    return null
  }
}

async function ensureOAuthProfile(user: User) {
  if (!user.email) return

  try {
    const admin = createSupabaseAdminClient()
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.display_name as string | undefined) ||
      user.email.split("@")[0] ||
      "MedLab User"

    const { error } = await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email.toLowerCase(),
        full_name: fullName,
        primary_role: "student",
      },
      { onConflict: "id" }
    )

    if (error) {
      console.warn(`[auth/callback] Failed to ensure OAuth profile for ${user.id}: ${error.message}`)
    }
  } catch (error) {
    console.warn(
      `[auth/callback] Failed to ensure OAuth profile for ${user.id}: ${error instanceof Error ? error.message : "unknown error"}`
    )
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = request.nextUrl.searchParams.get("next") ?? "/"
  const oauthError = request.nextUrl.searchParams.get("error")
  const oauthErrorDescription = request.nextUrl.searchParams.get("error_description")

  if (!code) {
    if (oauthError) {
      const url = new URL("/student/login", request.url)
      url.searchParams.set("error", oauthError)
      if (oauthErrorDescription) {
        url.searchParams.set("error_description", oauthErrorDescription)
      }
      return NextResponse.redirect(url)
    }

    return NextResponse.redirect(new URL("/student/login?error=oauth_missing_code", request.url))
  }

  const authCookies: Array<{ name: string; value: string; options: CookieOptions }> = []
  const redirectWithAuthCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    authCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          authCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(new URL("/student/login?error=oauth_failed", request.url))
  }

  await ensureOAuthProfile(user)

  const safeRedirect = resolveSafeRedirectUrl(request, next)
  if (safeRedirect) {
    return redirectWithAuthCookies(safeRedirect)
  }

  // Determine where to send them based on role
  const { data: memberships } = await supabase
    .from("institution_memberships")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")

  const roles = new Set((memberships || []).map((m: { role?: string | null }) => (m.role || "").toLowerCase()))
  const hasInstitutionPortalAccess =
    roles.has("institution_admin") || roles.has("admin") || roles.has("educator") || roles.has("teacher")

  if (hasInstitutionPortalAccess) {
    return redirectWithAuthCookies(new URL("/institution/courses", request.url))
  }

  if (roles.size > 0) {
    return redirectWithAuthCookies(new URL("/learn", request.url))
  }

  // New user with no memberships — check profile for primary role
  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.primary_role === "institution") {
    return redirectWithAuthCookies(new URL("/institution/onboarding", request.url))
  }

  return redirectWithAuthCookies(new URL("/learn", request.url))
}
