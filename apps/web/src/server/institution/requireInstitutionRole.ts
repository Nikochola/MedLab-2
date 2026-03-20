import { getCurrentInstitutionForUser } from "@/server/institution/getCurrentInstitutionForUser"

import type { InstitutionContext, InstitutionRole } from "@/server/institution/types"

export async function requireInstitutionRole(userId: string, allowedRoles: InstitutionRole[]): Promise<InstitutionContext> {
  const context = await getCurrentInstitutionForUser(userId)

  if (!context) {
    throw new Error("No institution membership found")
  }

  if (!allowedRoles.includes(context.membership.role)) {
    throw new Error("You do not have permission for this action")
  }

  return context
}
