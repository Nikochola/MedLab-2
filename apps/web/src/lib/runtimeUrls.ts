function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function ensureLeadingSlash(pathname: string) {
  return pathname.startsWith("/") ? pathname : `/${pathname}`
}

function getDefaultAppOrigin() {
  if (process.env.NODE_ENV === "development") return "http://localhost:3015"
  return "https://app.medlabinteractive.com"
}

/** Origin for the current app — used when an absolute URL is needed for same-app links. */
function getCurrentOrigin() {
  if (typeof window !== "undefined") return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || getDefaultAppOrigin()
}

export function getInstitutionAppOrigin() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      getCurrentOrigin()
  )
}

export function getMarketingOrigin() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_MARKETING_URL ||
      process.env.MARKETING_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://medlabinteractive.com")
  )
}

export function getStudentAppOrigin() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_STUDENT_APP_URL ||
      process.env.STUDENT_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      getDefaultAppOrigin()
  )
}

export function buildInstitutionUrl(pathname: string) {
  const origin = getInstitutionAppOrigin()
  const path = ensureLeadingSlash(pathname)
  // If same origin, return just the path to avoid cross-origin issues
  if (typeof window !== "undefined" && origin === window.location.origin) return path
  return `${origin}${path}`
}

export function buildMarketingUrl(pathname: string) {
  return `${getMarketingOrigin()}${ensureLeadingSlash(pathname)}`
}

export function buildStudentAppUrl(pathname: string) {
  const origin = getStudentAppOrigin()
  const path = ensureLeadingSlash(pathname)
  if (typeof window !== "undefined" && origin === window.location.origin) return path
  return `${origin}${path}`
}

export function buildAuthCallbackUrl(next?: string | null) {
  const url = new URL("/auth/callback", getStudentAppOrigin())
  if (next) url.searchParams.set("next", next)
  return url.toString()
}
