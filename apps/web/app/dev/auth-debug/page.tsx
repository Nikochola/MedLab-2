import { notFound } from "next/navigation"

import { getCurrentInstitutionForUser } from "@/server/institution"
import { getMembershipLookupUserIds, getServerSession, needsOnboarding, resolveRoleForUser } from "@/server/auth/session"

export default async function AuthDebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const session = await getServerSession()
  const userId = session?.user?.id || null
  const email = session?.user?.email || null

  const lookupIds = userId ? await getMembershipLookupUserIds(userId) : []
  const role = userId ? await resolveRoleForUser(userId) : null
  const onboarding = userId ? await needsOnboarding(userId) : null
  const institution = userId ? await getCurrentInstitutionForUser(userId) : null

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Auth Debug</h1>
      <p className="mt-1 text-sm text-slate-600">Development-only session and role diagnostics.</p>

      <pre className="mt-6 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50">
        {JSON.stringify(
          {
            session: {
              userId,
              email
            },
            membershipLookupUserIds: lookupIds,
            resolvedRole: role,
            needsOnboarding: onboarding,
            institution: institution
              ? {
                  id: institution.institution.id,
                  name: institution.institution.name,
                  membershipRole: institution.membership.role,
                  membershipUserId: institution.membership.user_id
                }
              : null
          },
          null,
          2
        )}
      </pre>
    </main>
  )
}
