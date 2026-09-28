import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { StudentShell } from "@/components/shell/StudentShell"
import { getSessionWithRole } from "@/server/auth/session"
import { getCurrentInstitutionForUser, getEnterpriseWorkspace } from "@/server/institution"

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/student/login?next=/learn")
  }

  const context = await getCurrentInstitutionForUser(sessionWithRole.session.user.id)
  const enterprise = context ? await getEnterpriseWorkspace(context) : null
  const branding = enterprise?.branding?.enabled ? enterprise.branding : null

  return <StudentShell branding={branding ? { name: branding.productName || context?.institution.name || null, logoUrl: branding.logoUrl, primaryColor: branding.primaryColor, accentColor: branding.accentColor, hideMedlabBranding: branding.hideMedlabBranding } : null}>{children}</StudentShell>
}
