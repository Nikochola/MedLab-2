import { redirect } from "next/navigation"

import { InstitutionOnboardingWizard } from "@/components/institution/InstitutionOnboardingWizard"
import { getServerSession, needsOnboarding } from "@/server/auth/session"
import { detectInstitutionByEmailDomain } from "@/server/institution"

export default async function InstitutionOnboardingPage() {
  const session = await getServerSession()

  if (!session?.user?.id || !session.user.email) {
    redirect("/institution/login?next=/institution/onboarding")
  }

  if (!(await needsOnboarding(session.user.id))) {
    redirect("/institution/courses")
  }

  const domainMatch = await detectInstitutionByEmailDomain(session.user.email)
  const initialAdminName = session.user.name || session.user.email.split("@")[0] || "Administrator"

  return (
    <InstitutionOnboardingWizard
      initialAdminName={initialAdminName}
      initialEmail={session.user.email}
      domainMatch={domainMatch ? { name: domainMatch.name, slug: domainMatch.slug } : null}
    />
  )
}
