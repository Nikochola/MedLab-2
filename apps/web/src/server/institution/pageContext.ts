import { redirect } from "next/navigation"

import { getSessionWithRole } from "@/server/auth/session"
import { requireInstitutionRole } from "@/server/institution/requireInstitutionRole"

export async function requireStarterPortalContext(nextPath: string) {
  const sessionWithRole = await getSessionWithRole()
  if (!sessionWithRole) redirect(`/institution/login?next=${encodeURIComponent(nextPath)}`)

  const context = await requireInstitutionRole(sessionWithRole.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])
  return { sessionWithRole, context }
}
