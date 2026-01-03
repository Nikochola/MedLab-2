import { NextResponse, type NextRequest } from "next/server"

const baseDomain = process.env.INVITE_BASE_DOMAIN || "medlabinteractive.com"
const managementHost = process.env.MANAGEMENT_HOST || `management.${baseDomain}`
const managementFallbackHost = `management.${baseDomain}`

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const host = req.headers.get("host") || ""

  // Platform admin host passthrough
  if (host === managementHost || host === managementFallbackHost) {
    if (url.pathname === "/") {
      url.pathname = "/platform-admin"
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // Org subdomain handling
  const suffix = `.${baseDomain}`
  if (host.endsWith(suffix)) {
    const slug = host.slice(0, -suffix.length)
    if (slug) {
      const res = NextResponse.next()
      res.cookies.set("medlab_org", slug, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      })

      if (url.pathname === "/") {
        url.pathname = "/login"
        return NextResponse.rewrite(url, res)
      }
      if (url.pathname === "/admin") {
        url.pathname = `/org/${slug}/admin`
        return NextResponse.rewrite(url, res)
      }
      if (url.pathname === "/student") {
        url.pathname = `/org/${slug}/student`
        return NextResponse.rewrite(url, res)
      }
      if (url.pathname === "/teacher") {
        url.pathname = "/teacher/dashboard"
        return NextResponse.rewrite(url, res)
      }
      if (url.pathname === "/teacher/signin") {
        url.pathname = `/org/${slug}/teacher-invite`
        return NextResponse.rewrite(url, res)
      }
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
