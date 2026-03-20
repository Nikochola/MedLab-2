function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function localOrProduction(localValue: string, productionValue: string) {
  return process.env.NODE_ENV === "development" ? localValue : productionValue
}

export function getInstitutionAppOrigin() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
      process.env.WEB_APP_URL ||
      localOrProduction("http://localhost:3015", "https://app.medlabinteractive.com")
  )
}

export function getStudentAppOrigin() {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_STUDENT_APP_URL ||
      process.env.STUDENT_APP_URL ||
      localOrProduction("http://localhost:3015", "https://app.medlabinteractive.com")
  )
}

export function buildInstitutionUrl(pathname: string) {
  return `${getInstitutionAppOrigin()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`
}

export function buildStudentAppUrl(pathname: string) {
  return `${getStudentAppOrigin()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`
}
