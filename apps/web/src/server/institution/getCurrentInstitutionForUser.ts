import { getMembershipLookupUserIds } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

import type { InstitutionContext } from "@/server/institution/types"

export async function getCurrentInstitutionForUser(userId: string): Promise<InstitutionContext | null> {
  const lookupIds = await getMembershipLookupUserIds(userId)

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("institution_memberships")
    .select("institution_id,user_id,role,status,created_at")
    .in("user_id", lookupIds)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })

  if (membershipError) {
    throw new Error(`Failed to load institution memberships: ${membershipError.message}`)
  }

  if (!memberships?.length) {
    return null
  }

  const selectedMembership = memberships.find((membership: { user_id: string }) => membership.user_id === userId) || memberships[0]

  const { data: institution, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .select("id,name,slug,logo_url,timezone,institution_type,country_region,estimated_students,billing_plan,billing_status,billing_interval,billing_code,billing_contact_name,billing_card_brand,billing_card_last4,content_library,student_access_policy,onboarding_completed_at,access_request_id,created_at")
    .eq("id", selectedMembership.institution_id)
    .maybeSingle()

  if (institutionError) {
    throw new Error(`Failed to load institution: ${institutionError.message}`)
  }

  if (!institution) {
    return null
  }

  return {
    institution,
    membership: {
      ...selectedMembership,
      user_id: userId
    }
  } as InstitutionContext
}
