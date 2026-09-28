const DEFAULT_INSTITUTION_DOMAIN = "getmedlab.com"
const LEGACY_INSTITUTION_DOMAIN = "medlabinteractive.com"

export function getInstitutionPortalDomain() {
  return (
    process.env.NEXT_PUBLIC_INSTITUTION_PORTAL_DOMAIN ||
    process.env.INSTITUTION_PORTAL_DOMAIN ||
    DEFAULT_INSTITUTION_DOMAIN
  ).toLowerCase().replace(/^\.+|\.+$/g, "")
}

export function getInstitutionSubdomainSlug(rawHost: string) {
  const host = rawHost.split(":")[0].toLowerCase()
  const domains = Array.from(new Set([getInstitutionPortalDomain(), LEGACY_INSTITUTION_DOMAIN]))

  for (const domain of domains) {
    if (!host.endsWith(`.${domain}`)) continue
    const slug = host.slice(0, -(domain.length + 1))
    if (slug && slug !== "www" && slug !== "app") return slug
  }

  return null
}

export function institutionPortalHost(slug: string) {
  return `${slug}.${getInstitutionPortalDomain()}`
}
