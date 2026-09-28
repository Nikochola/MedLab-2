import { notFound, redirect } from "next/navigation"

import { InstitutionCasePractice } from "@/components/institution/InstitutionCasePractice"
import { getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export default async function InstitutionCasePage({ params, searchParams }: { params: { caseId: string }; searchParams?: { courseId?: string } }) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect(`/institution/login?next=${encodeURIComponent(`/institution-cases/${params.caseId}`)}`)
  const { data: institutionCase } = await supabaseAdmin.from("institution_cases").select("id,institution_id,title,modality,difficulty,duration_min,patient_summary,clinical_prompt,institutions!inner(billing_plan)").eq("id", params.caseId).eq("status", "PUBLISHED").eq("institutions.billing_plan", "ENTERPRISE").maybeSingle()
  if (!institutionCase) notFound()
  const { data: membership } = await supabaseAdmin.from("institution_memberships").select("id").eq("institution_id", institutionCase.institution_id).eq("user_id", session.user.id).eq("role", "STUDENT").eq("status", "ACTIVE").maybeSingle()
  if (!membership) notFound()
  return <InstitutionCasePractice caseId={String(institutionCase.id)} title={String(institutionCase.title)} modality={String(institutionCase.modality)} difficulty={String(institutionCase.difficulty)} durationMin={Number(institutionCase.duration_min)} patientSummary={String(institutionCase.patient_summary)} clinicalPrompt={String(institutionCase.clinical_prompt)} courseId={searchParams?.courseId || null} />
}
