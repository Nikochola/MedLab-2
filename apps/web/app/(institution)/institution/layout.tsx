import { redirect } from "next/navigation"
import type { CSSProperties, ReactNode } from "react"

import { InstitutionNav } from "@/components/institution/InstitutionNav"
import { getCurrentInstitutionForUser, getEnterpriseWorkspace } from "@/server/institution"
import { getSessionWithRole, needsOnboarding } from "@/server/auth/session"

export default async function InstitutionLayout({ children }: { children: ReactNode }) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/institution/login?next=/institution/overview")
  }

  if (await needsOnboarding(sessionWithRole.session.user.id)) {
    redirect("/institution/onboarding")
  }

  const context = await getCurrentInstitutionForUser(sessionWithRole.session.user.id)

  if (!context) {
    redirect(sessionWithRole.role === "student" ? "/learn" : "/institution/onboarding")
  }

  // Institution membership is authoritative for portal access. A student's
  // profile-level role may still be "institution", so it cannot safely gate
  // the staff portal by itself.
  if (context.membership.role === "STUDENT") {
    redirect("/learn")
  }

  const userName = sessionWithRole.session.user.name || sessionWithRole.session.user.email?.split("@")[0] || "MedLab member"
  const userEmail = sessionWithRole.session.user.email || ""
  const enterprise = await getEnterpriseWorkspace(context)
  const branding = enterprise.branding?.enabled ? enterprise.branding : null
  const shellStyle = branding ? { "--institution-primary": branding.primaryColor, "--institution-accent": branding.accentColor } as CSSProperties : undefined

  return (
    <div className="institution-shell" style={shellStyle}>
      {branding?.faviconUrl ? <link rel="icon" href={branding.faviconUrl} /> : null}
      <div className="institution-shell-grid">
        <InstitutionNav
          institutionName={context.institution.name}
          role={context.membership.role as "INSTITUTION_ADMIN" | "EDUCATOR"}
          userName={userName}
          userEmail={userEmail}
          brandName={branding?.productName || null}
          brandLogoUrl={branding?.logoUrl || null}
          hideMedlabBranding={Boolean(branding?.hideMedlabBranding)}
        />
        <section className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</section>
      </div>
    </div>
  )
}
