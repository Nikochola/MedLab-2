import { NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { getInstitutionAppOrigin, getStudentAppOrigin } from "@/lib/runtimeUrls"

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

export async function middleware(request: NextRequest) {
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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isInstitutionHost = !isLocalRequest(request) && request.nextUrl.origin === getInstitutionAppOrigin()
  const isStudentHost = !isLocalRequest(request) && request.nextUrl.origin === getStudentAppOrigin()

  if (!isLocalRequest(request)) {
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

  // Determine if the current page is an auth page (login/signup/invite)
  const isSetupFlow = pathname.startsWith("/institution/setup/")
  const isInviteFlow = pathname.startsWith("/invite/") || pathname.startsWith("/student/invite")
  const isAdminLogin = pathname === "/admin/login"
  const isAuthPage = (pathname.includes("/login") || pathname.endsWith("/signup")) && !isAdminLogin
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")

  // Determine if the current page requires authentication
  const isProtected = (
    pathname.startsWith("/institution") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/more") ||
    pathname.startsWith("/xray") ||
    pathname.startsWith("/ecg") ||
    pathname.startsWith("/ct") ||
    isAdminRoute
  ) && !isAuthPage && !isSetupFlow

  // 1. Unauthenticated users trying to access protected routes → redirect to login
  if (!user && isProtected) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/admin/login", request.nextUrl.origin))
    }
    const shouldUseInstitutionLogin = pathname.startsWith("/institution") || isInstitutionHost
    const redirectUrl = buildAppUrl(request, shouldUseInstitutionLogin ? "institution" : "student", shouldUseInstitutionLogin ? "/institution/login" : "/student/login")
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 2. Authenticated users on auth pages → redirect to their dashboard
  if (user && isAuthPage) {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("primary_role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("institution_memberships")
        .select("role,status")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
    ])

    const roles = new Set((memberships || []).map((membership: { role?: string | null }) => String(membership.role || "").toLowerCase()))
    const hasAnyInstitutionMembership = roles.size > 0
    const hasInstitutionPortalAccess =
      roles.has("institution_admin") || roles.has("admin") || roles.has("educator") || roles.has("teacher")

    const destination = hasInstitutionPortalAccess
      ? buildAppUrl(request, "institution", "/institution/courses")
      : hasAnyInstitutionMembership
        ? buildAppUrl(request, "institution", "/learn")
      : profile?.primary_role === "institution"
        ? buildAppUrl(request, "institution", "/institution/onboarding")
        : buildAppUrl(request, "student", "/learn")
    return NextResponse.redirect(destination)
  }

  // 3. Role-based access control for authenticated users
  if (user && !isAuthPage && !isInviteFlow && !isSetupFlow) {
    const isInstitutionPath = pathname.startsWith("/institution")
    const isOnboardingPath = pathname.startsWith("/institution/onboarding")
    const isStudentPath = pathname.startsWith("/practice") || pathname.startsWith("/learn") || pathname.startsWith("/xray") || pathname.startsWith("/ecg") || pathname.startsWith("/ct")

    // Only fetch profile if we need to check roles
    if (isInstitutionPath || isStudentPath) {
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase
          .from("profiles")
          .select("primary_role")
          .eq("id", user.id)
          .single(),
        supabase
          .from("institution_memberships")
          .select("role,status")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
      ])

      const roles = new Set((memberships || []).map((membership: { role?: string | null }) => String(membership.role || "").toLowerCase()))
      const hasAnyInstitutionMembership = roles.size > 0
      const hasInstitutionPortalAccess =
        roles.has("institution_admin") || roles.has("admin") || roles.has("educator") || roles.has("teacher")

      if (isInstitutionPath && hasInstitutionPortalAccess) {
        return response
      }

      if (isInstitutionPath && hasAnyInstitutionMembership && !hasInstitutionPortalAccess) {
        return NextResponse.redirect(buildAppUrl(request, "institution", "/learn"))
      }

      if (isInstitutionPath && profile?.primary_role === "institution" && !hasInstitutionPortalAccess && !isOnboardingPath) {
        return NextResponse.redirect(buildAppUrl(request, "institution", "/institution/onboarding"))
      }

      // Students trying to access institution routes
      if (profile?.primary_role === "student" && isInstitutionPath) {
        return NextResponse.redirect(buildAppUrl(request, hasAnyInstitutionMembership ? "institution" : "student", "/learn"))
      }

      if (isStudentPath && hasInstitutionPortalAccess) {
        return NextResponse.redirect(buildAppUrl(request, "institution", "/institution/courses"))
      }

      if (isStudentPath && hasAnyInstitutionMembership && isStudentHost) {
        return NextResponse.redirect(buildAppUrl(request, "institution", "/learn"))
      }

      if (isStudentPath && !hasAnyInstitutionMembership && isInstitutionHost) {
        return NextResponse.redirect(buildAppUrl(request, "student", "/learn"))
      }
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth).*)"]
}
