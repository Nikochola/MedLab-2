import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getInstitutionAppOrigin, getStudentAppOrigin } from "@/lib/runtimeUrls"

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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = request.nextUrl.searchParams.get("next") ?? "/"

  if (!code) {
    return NextResponse.redirect(new URL("/student/login?error=oauth_missing_code", request.url))
  }

  const response = NextResponse.redirect(new URL("/", request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(new URL("/student/login?error=oauth_failed", request.url))
  }

  const safeRedirect = resolveSafeRedirectUrl(request, next)
  if (safeRedirect) {
    return NextResponse.redirect(safeRedirect)
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
    return NextResponse.redirect(new URL("/institution/courses", request.url))
  }

  if (roles.size > 0) {
    return NextResponse.redirect(new URL("/learn", request.url))
  }

  // New user with no memberships — check profile for primary role
  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.primary_role === "institution") {
    return NextResponse.redirect(new URL("/institution/onboarding", request.url))
  }

  return NextResponse.redirect(new URL("/learn", request.url))
}
