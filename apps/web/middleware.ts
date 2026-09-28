import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getInstitutionAppOrigin, getStudentAppOrigin } from "@/lib/runtimeUrls"
import { getInstitutionSubdomainSlug } from "@/lib/institutionDomains"

function isLocalRequest(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  return hostname === "localhost" || hostname === "127.0.0.1"
}

function buildAppUrl(request: NextRequest, kind: "institution" | "student", pathname: string) {
  const baseOrigin = isLocalRequest(request)
    ? request.nextUrl.origin
    : kind === "institution"
      ? getInstitutionAppOrigin()
      : getStudentAppOrigin()

  return new URL(pathname, baseOrigin)
}

function resolveSafeNextRedirect(request: NextRequest, next: string | null) {
  if (!next) return null

  if (next.startsWith("/") && !next.startsWith("//")) {
    return new URL(next, request.nextUrl.origin)
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

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || request.nextUrl.host
  const institutionSlug = !isLocalRequest(request) ? getInstitutionSubdomainSlug(rawHost) : null
  const isSubdomainRequest = Boolean(institutionSlug)

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // ── Subdomain routing (slug.medlabinteractive.com) ──────────────────────────
  if (isSubdomainRequest) {
    // Root or /login → institution login page (rewrite, not redirect, so URL stays clean)
    if (pathname === "/" || pathname === "/login") {
      const url = request.nextUrl.clone()
      url.pathname = "/institution/login"
      return NextResponse.rewrite(url)
    }
  }

  // ── Cross-host redirects (non-subdomain production) ─────────────────────────
  const isInstitutionHost = isSubdomainRequest ||
    (!isLocalRequest(request) && request.nextUrl.origin === getInstitutionAppOrigin())
  const isStudentHost = !isLocalRequest(request) && request.nextUrl.origin === getStudentAppOrigin()

  if (!isLocalRequest(request) && !isSubdomainRequest) {
    if ((pathname.startsWith("/institution") || pathname.startsWith("/invite/")) && !isInstitutionHost) {
      const redirectUrl = buildAppUrl(request, "institution", pathname)
      redirectUrl.search = request.nextUrl.search
      return NextResponse.redirect(redirectUrl)
    }

    if ((pathname.startsWith("/student/login") || pathname.startsWith("/student/signup")) && !isStudentHost) {
      const redirectUrl = buildAppUrl(request, "student", pathname)
      redirectUrl.search = request.nextUrl.search
      return NextResponse.redirect(redirectUrl)
    }
  }

  // ── Auth page / protected route classification ───────────────────────────────
  const isSetupFlow = pathname.startsWith("/institution/setup/")
  const isInviteFlow = pathname.startsWith("/invite/") || pathname.startsWith("/student/invite")
  const isAdminLogin = pathname === "/admin/login"
  const isAuthPage = (pathname.includes("/login") || pathname.endsWith("/signup")) && !isAdminLogin
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")

  const isProtected = (
    pathname.startsWith("/institution") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/more") ||
    pathname.startsWith("/institution-cases") ||
    pathname.startsWith("/xray") ||
    pathname.startsWith("/ecg") ||
    pathname.startsWith("/ct") ||
    isAdminRoute
  ) && !isAuthPage && !isSetupFlow

  // ── 1. Unauthenticated → login ───────────────────────────────────────────────
  if (!user && isProtected) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.nextUrl.origin))
    }
    if (isSubdomainRequest) {
      // Stay on the same subdomain
      const loginUrl = new URL("/institution/login", request.nextUrl.origin)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
    const shouldUseInstitutionLogin = pathname.startsWith("/institution") || isInstitutionHost
    const redirectUrl = buildAppUrl(
      request,
      shouldUseInstitutionLogin ? "institution" : "student",
      shouldUseInstitutionLogin ? "/institution/login" : "/student/login"
    )
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── 2. Authenticated on auth page → dashboard ────────────────────────────────
  if (user && isAuthPage) {
    const safeNext = resolveSafeNextRedirect(request, request.nextUrl.searchParams.get("next"))
    if (safeNext) return NextResponse.redirect(safeNext)

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("primary_role").eq("id", user.id).single(),
      supabase.from("institution_memberships").select("role,status").eq("user_id", user.id).eq("status", "ACTIVE"),
    ])

    const roles = new Set((memberships || []).map((m: { role?: string | null }) => String(m.role || "").toLowerCase()))
    const hasAnyInstitutionMembership = roles.size > 0
    const hasInstitutionPortalAccess =
      roles.has("institution_admin") || roles.has("admin") || roles.has("educator") || roles.has("teacher")

    if (isSubdomainRequest) {
      // Stay on the subdomain for all redirects
      const dest = hasInstitutionPortalAccess
        ? new URL("/institution/overview", request.nextUrl.origin)
        : hasAnyInstitutionMembership
          ? new URL("/learn", request.nextUrl.origin)
          : profile?.primary_role === "institution"
            ? new URL("/institution/onboarding", request.nextUrl.origin)
            : new URL("/learn", request.nextUrl.origin)
      return NextResponse.redirect(dest)
    }

    const destination = hasInstitutionPortalAccess
      ? buildAppUrl(request, "institution", "/institution/overview")
      : hasAnyInstitutionMembership
        ? buildAppUrl(request, "institution", "/learn")
        : profile?.primary_role === "institution"
          ? buildAppUrl(request, "institution", "/institution/onboarding")
          : buildAppUrl(request, "student", "/learn")
    return NextResponse.redirect(destination)
  }

  // ── 3. Role-based access for authenticated users ─────────────────────────────
  if (user && !isAuthPage && !isInviteFlow && !isSetupFlow) {
    const isInstitutionPath = pathname.startsWith("/institution")
    const isOnboardingPath = pathname.startsWith("/institution/onboarding")
    const isStudentPath = pathname.startsWith("/practice") || pathname.startsWith("/learn") ||
      pathname.startsWith("/xray") || pathname.startsWith("/ecg") || pathname.startsWith("/ct") || pathname.startsWith("/institution-cases")

    const appsOnSameHost = isSubdomainRequest || getInstitutionAppOrigin() === getStudentAppOrigin()

    // Protected institution layouts perform the authoritative role check with
    // service-role visibility. Avoid duplicating that decision through anon
    // RLS here, which can hide a just-authenticated membership and redirect a
    // completed workspace between onboarding and courses indefinitely.
    if (isInstitutionPath) return response

    if (isStudentPath) {
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase.from("profiles").select("primary_role").eq("id", user.id).single(),
        supabase.from("institution_memberships").select("role,status").eq("user_id", user.id).eq("status", "ACTIVE"),
      ])

      const roles = new Set((memberships || []).map((m: { role?: string | null }) => String(m.role || "").toLowerCase()))
      const hasAnyInstitutionMembership = roles.size > 0
      const hasInstitutionPortalAccess =
        roles.has("institution_admin") || roles.has("admin") || roles.has("educator") || roles.has("teacher")

      if (isInstitutionPath && hasInstitutionPortalAccess) return response

      if (isInstitutionPath && hasAnyInstitutionMembership && !hasInstitutionPortalAccess) {
        return NextResponse.redirect(
          isSubdomainRequest
            ? new URL("/learn", request.nextUrl.origin)
            : buildAppUrl(request, "institution", "/learn")
        )
      }

      if (isInstitutionPath && profile?.primary_role === "institution" && !hasInstitutionPortalAccess && !isOnboardingPath) {
        return NextResponse.redirect(
          isSubdomainRequest
            ? new URL("/institution/onboarding", request.nextUrl.origin)
            : buildAppUrl(request, "institution", "/institution/onboarding")
        )
      }

      if (profile?.primary_role === "student" && isInstitutionPath) {
        return NextResponse.redirect(
          isSubdomainRequest
            ? new URL("/learn", request.nextUrl.origin)
            : buildAppUrl(request, hasAnyInstitutionMembership ? "institution" : "student", "/learn")
        )
      }

      if (isStudentPath && hasInstitutionPortalAccess) {
        return NextResponse.redirect(
          isSubdomainRequest
            ? new URL("/institution/overview", request.nextUrl.origin)
            : buildAppUrl(request, "institution", "/institution/overview")
        )
      }

      if (!appsOnSameHost) {
        if (isStudentPath && hasAnyInstitutionMembership && isStudentHost) {
          return NextResponse.redirect(buildAppUrl(request, "institution", "/learn"))
        }
        if (isStudentPath && !hasAnyInstitutionMembership && isInstitutionHost) {
          return NextResponse.redirect(buildAppUrl(request, "student", "/learn"))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth).*)"]
}
