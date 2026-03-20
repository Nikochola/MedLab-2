import { redirect } from "next/navigation"

import { getSessionWithRole, needsOnboarding, redirectPathForRole } from "@/server/auth/session"

export default async function HomePage() {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/student/login")
  }

  if (await needsOnboarding(sessionWithRole.session.user.id)) {
    redirect("/institution/onboarding")
  }

  redirect(redirectPathForRole(sessionWithRole.role))
}
