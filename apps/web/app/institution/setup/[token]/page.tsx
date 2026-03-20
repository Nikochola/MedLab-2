import { redirect } from "next/navigation"

import { InstitutionOnboardingWizard } from "@/components/institution/InstitutionOnboardingWizard"
import { getServerSession, needsOnboarding } from "@/server/auth/session"
import { getInstitutionSetupContextByToken } from "@/server/institution/access"

export default async function InstitutionSetupPage({ params }: { params: { token: string } }) {
  const setupContext = await getInstitutionSetupContextByToken(params.token)

  if (!setupContext || setupContext.isExpired || setupContext.claimed_at) {
    const session = await getServerSession()

    if (session?.user?.id && (await needsOnboarding(session.user.id))) {
      redirect("/institution/onboarding")
    }

    redirect("/institution/login")
  }

  return (
    <InstitutionOnboardingWizard
      initialAdminName={setupContext.full_name}
      initialEmail={setupContext.work_email}
      domainMatch={setupContext.existingInstitution ? { name: setupContext.existingInstitution.name, slug: setupContext.existingInstitution.slug } : null}
      setupLink={{
        token: params.token,
        requestId: setupContext.request_id,
        fullName: setupContext.full_name,
        workEmail: setupContext.work_email,
        institutionName: setupContext.institution_name,
        institutionType: setupContext.institution_type,
        estimatedStudents: setupContext.estimated_students
      }}
    />
  )
}
