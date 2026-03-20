import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { getCurrentInstitutionForUser } from "@/server/institution"
import { getSessionWithRole, needsOnboarding } from "@/server/auth/session"

export default async function InstitutionLayout({ children }: { children: ReactNode }) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/institution/login?next=/institution/courses")
  }

  if (await needsOnboarding(sessionWithRole.session.user.id)) {
    redirect("/institution/onboarding")
  }

  if (sessionWithRole.role === "student") {
    redirect("/learn")
  }

  const context = await getCurrentInstitutionForUser(sessionWithRole.session.user.id)

  if (!context) {
    redirect("/institution/onboarding")
  }

  return (
    <div className="institution-shell">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface-card h-fit p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Institution</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{context.institution.name}</h2>
          <p className="mt-1 text-xs text-slate-500">Role: {context.membership.role.replace("_", " ")}</p>

          <nav className="mt-6 space-y-2">
            <Link href="/institution/courses" className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Courses
            </Link>
            <Link href="/institution/settings" className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Settings
            </Link>
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </div>
  )
}
