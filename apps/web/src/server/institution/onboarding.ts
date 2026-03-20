"use server"

import { getServerSession } from "@/server/auth/session"
import { getCurrentInstitutionForUser } from "@/server/institution/getCurrentInstitutionForUser"
import { ensureDefaultCourse } from "@/server/institution/courses"
import { validateInstitutionBillingCode } from "@/server/institution/access"
import { inviteMembers } from "@/server/institution/members"
import { supabaseAdmin } from "@/server/supabaseAdmin"

type InstitutionType =
  | "University"
  | "Medical School"
  | "Hospital"
  | "Residency Program"
  | "Other"

type BillingPlan = "STARTER" | "GROWTH" | "ENTERPRISE"
type BillingInterval = "MONTHLY" | "ANNUAL"
type ContentLibrary = "ECG" | "RADIOLOGY" | "BOTH"
type StudentAccessPolicy = "INVITE_ONLY" | "SSO"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
}

async function ensureAvailableInstitutionSlug(rawValue: string, currentInstitutionId?: string | null) {
  const candidate = slugify(rawValue)

  if (!candidate) {
    throw new Error("Workspace name must contain letters or numbers.")
  }

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id")
    .eq("slug", candidate)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate institution workspace: ${error.message}`)
  }

  if (data && data.id !== currentInstitutionId) {
    throw new Error("That workspace name is already taken.")
  }

  return candidate
}

function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, "")
}

function inferCardBrand(cardNumber: string) {
  if (/^4/.test(cardNumber)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return "Mastercard"
  if (/^3[47]/.test(cardNumber)) return "American Express"
  if (/^6(?:011|5)/.test(cardNumber)) return "Discover"
  return "Card"
}

export async function checkInstitutionWorkspaceSlugAvailability(rawValue: string, currentInstitutionId?: string | null) {
  const candidate = slugify(rawValue)

  if (!candidate) {
    return {
      available: false,
      slug: "",
      message: "Workspace name must contain letters or numbers."
    }
  }

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("id")
    .eq("slug", candidate)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to inspect workspace availability: ${error.message}`)
  }

  const available = !data || data.id === currentInstitutionId

  return {
    available,
    slug: candidate,
    message: available ? "Workspace is available." : "That workspace name is already taken."
  }
}

export async function detectInstitutionByEmailDomain(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const domain = normalizedEmail.split("@")[1]

  if (!domain) {
    return null
  }

  const { data: matchingProfiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email")
    .ilike("email", `%@${domain}`)
    .limit(25)

  if (profileError) {
    throw new Error(`Failed to inspect email domain: ${profileError.message}`)
  }

  const profileIds = (matchingProfiles || []).map((profile) => profile.id).filter(Boolean)
  if (!profileIds.length) {
    return null
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("institution_memberships")
    .select("institution_id")
    .in("user_id", profileIds)
    .eq("status", "ACTIVE")
    .limit(25)

  if (membershipError) {
    throw new Error(`Failed to inspect institution domain memberships: ${membershipError.message}`)
  }

  const institutionIds = Array.from(new Set((memberships || []).map((row) => row.institution_id).filter(Boolean)))
  if (!institutionIds.length) {
    return null
  }

  const { data: institutions, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .select("id,name,slug")
    .in("id", institutionIds)
    .limit(5)

  if (institutionError) {
    throw new Error(`Failed to inspect institution domain matches: ${institutionError.message}`)
  }

  return institutions?.[0] || null
}

export async function createInstitutionForUser(input: {
  userId: string
  institutionName: string
  institutionType?: InstitutionType | null
  countryRegion?: string | null
  estimatedStudents?: number | null
  logoUrl?: string | null
  workspaceSlug?: string | null
  timezone?: string | null
  billingPlan?: BillingPlan | null
  billingInterval?: BillingInterval | null
  billingCode?: string | null
  billingContactName?: string | null
  billingCardBrand?: string | null
  billingCardLast4?: string | null
  accessRequestId?: string | null
  contentLibrary?: ContentLibrary | null
  studentAccessPolicy?: StudentAccessPolicy | null
  pendingTeamInvites?: Array<{ name: string; email: string; role: "EDUCATOR" | "INSTITUTION_ADMIN" }> | null
}) {
  const name = input.institutionName.trim()

  if (!name) {
    throw new Error("Institution name is required")
  }

  const slug = await ensureAvailableInstitutionSlug(input.workspaceSlug || name)

  const { data: institution, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .insert({
      name,
      slug,
      logo_url: input.logoUrl?.trim() || null,
      timezone: input.timezone?.trim() || null,
      institution_type: input.institutionType || null,
      country_region: input.countryRegion?.trim() || null,
      estimated_students: input.estimatedStudents ?? null,
      billing_plan: input.billingPlan || null,
      billing_status: input.billingPlan ? "active" : "draft",
      billing_interval: input.billingInterval || "MONTHLY",
      billing_code: input.billingCode?.trim() || null,
      billing_contact_name: input.billingContactName?.trim() || null,
      billing_card_brand: input.billingCardBrand?.trim() || null,
      billing_card_last4: input.billingCardLast4?.trim() || null,
      content_library: input.contentLibrary || "BOTH",
      student_access_policy: input.studentAccessPolicy || "INVITE_ONLY",
      pending_team_invites: input.pendingTeamInvites || [],
      onboarding_completed_at: new Date().toISOString(),
      access_request_id: input.accessRequestId || null,
      created_by: input.userId
    })
    .select("id,name,slug,logo_url,timezone,institution_type,country_region,estimated_students,billing_plan,billing_status,billing_interval,billing_code,billing_contact_name,billing_card_brand,billing_card_last4,content_library,student_access_policy,onboarding_completed_at,created_at")
    .single()

  if (institutionError || !institution) {
    throw new Error(`Failed to create institution: ${institutionError?.message || "Unknown error"}`)
  }

  const { error: membershipError } = await supabaseAdmin.from("institution_memberships").upsert(
    {
      institution_id: institution.id,
      user_id: input.userId,
      role: "INSTITUTION_ADMIN",
      status: "ACTIVE"
    },
    { onConflict: "institution_id,user_id" }
  )

  if (membershipError) {
    throw new Error(`Failed to create institution membership: ${membershipError.message}`)
  }

  await ensureDefaultCourse(institution.id)

  return institution
}

export async function completeInstitutionOnboarding(input: {
  institutionName: string
  institutionType: InstitutionType
  countryRegion: string
  estimatedStudents: number | null
  logoUrl?: string | null
  workspaceSlug: string
  billingPlan: BillingPlan
  billingInterval: BillingInterval
  billingCode?: string | null
  billingCardholderName?: string | null
  billingCardNumber?: string | null
  billingCardExpiry?: string | null
  billingCardCvc?: string | null
  contentLibrary: ContentLibrary
  studentAccessPolicy: StudentAccessPolicy
  adminName: string
  adminJobTitle: string
  adminPhone?: string | null
  accessRequestId?: string | null
  pendingTeamInvites?: Array<{ name: string; email: string; role: "EDUCATOR" | "INSTITUTION_ADMIN" }>
}) {
  const session = await getServerSession()

  if (!session?.user?.id || !session.user.email) {
    throw new Error("Unauthorized")
  }

  const adminName = input.adminName.trim()
  const adminJobTitle = input.adminJobTitle.trim()

  if (!adminName || !adminJobTitle) {
    throw new Error("Admin name and job title are required.")
  }

  if (input.studentAccessPolicy === "SSO" && input.billingPlan !== "ENTERPRISE") {
    throw new Error("SSO is only available on the Enterprise plan.")
  }

  const validBillingCode = input.billingCode
    ? await validateInstitutionBillingCode(input.billingCode, input.billingPlan)
    : null

  const normalizedCardNumber = normalizeCardNumber(input.billingCardNumber || "")
  const cardRequired = input.billingPlan !== "ENTERPRISE" && !validBillingCode?.waives_card

  if (cardRequired) {
    if (
      !input.billingCardholderName?.trim() ||
      normalizedCardNumber.length < 12 ||
      !/^\d{2}\/\d{2}$/.test((input.billingCardExpiry || "").trim()) ||
      !/^\d{3,4}$/.test((input.billingCardCvc || "").trim())
    ) {
      throw new Error("Valid card details are required unless a promo or contract code waives billing.")
    }
  }

  const billingCardBrand = normalizedCardNumber ? inferCardBrand(normalizedCardNumber) : null
  const billingCardLast4 = normalizedCardNumber ? normalizedCardNumber.slice(-4) : null

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: session.user.id,
        email: session.user.email,
        full_name: adminName,
        name: adminName,
        primary_role: "institution",
        job_title: adminJobTitle,
        phone: input.adminPhone?.trim() || null
      },
      { onConflict: "id" }
    )

  if (profileError) {
    throw new Error(`Failed to update admin profile: ${profileError.message}`)
  }

  const existingContext = await getCurrentInstitutionForUser(session.user.id)
  const sanitizedInvites = (input.pendingTeamInvites || [])
    .map((invite) => ({
      name: invite.name.trim(),
      email: invite.email.trim().toLowerCase(),
      role: invite.role
    }))
    .filter((invite) => invite.name && invite.email)

  const groupedInvites = {
    admins: sanitizedInvites.filter((invite) => invite.role === "INSTITUTION_ADMIN"),
    educators: sanitizedInvites.filter((invite) => invite.role === "EDUCATOR")
  }

  if (existingContext) {
    const slug = await ensureAvailableInstitutionSlug(input.workspaceSlug, existingContext.institution.id)

    const { error: updateInstitutionError } = await supabaseAdmin
      .from("institutions")
      .update({
        name: input.institutionName.trim(),
        slug,
        logo_url: input.logoUrl?.trim() || null,
        institution_type: input.institutionType,
        country_region: input.countryRegion.trim(),
        estimated_students: input.estimatedStudents,
        billing_plan: input.billingPlan,
        billing_status: input.billingPlan ? "active" : "draft",
        billing_interval: input.billingInterval,
        billing_code: validBillingCode?.code || input.billingCode?.trim() || null,
        billing_contact_name: input.billingCardholderName?.trim() || adminName,
        billing_card_brand: billingCardBrand,
        billing_card_last4: billingCardLast4,
        content_library: input.contentLibrary,
        student_access_policy: input.studentAccessPolicy,
        pending_team_invites: sanitizedInvites,
        onboarding_completed_at: new Date().toISOString(),
        access_request_id: input.accessRequestId || existingContext.institution.access_request_id || null
      })
      .eq("id", existingContext.institution.id)

    if (updateInstitutionError) {
      throw new Error(`Failed to update institution onboarding: ${updateInstitutionError.message}`)
    }

    if (groupedInvites.educators.length) {
      await inviteMembers({
        institutionId: existingContext.institution.id,
        courseId: null,
        invitedByUserId: session.user.id,
        role: "EDUCATOR",
        rows: groupedInvites.educators.map((invite) => ({
          email: invite.email,
          name: invite.name
        }))
      })
    }

    if (groupedInvites.admins.length) {
      await inviteMembers({
        institutionId: existingContext.institution.id,
        courseId: null,
        invitedByUserId: session.user.id,
        role: "INSTITUTION_ADMIN",
        rows: groupedInvites.admins.map((invite) => ({
          email: invite.email,
          name: invite.name
        }))
      })
    }

    return { success: true, redirectTo: "/institution/courses" }
  }

  const institution = await createInstitutionForUser({
    userId: session.user.id,
    institutionName: input.institutionName,
    institutionType: input.institutionType,
    countryRegion: input.countryRegion,
    estimatedStudents: input.estimatedStudents,
    logoUrl: input.logoUrl,
    workspaceSlug: input.workspaceSlug,
    billingPlan: input.billingPlan,
    billingInterval: input.billingInterval,
    billingCode: validBillingCode?.code || input.billingCode,
    billingContactName: input.billingCardholderName?.trim() || adminName,
    billingCardBrand,
    billingCardLast4,
    accessRequestId: input.accessRequestId || null,
    contentLibrary: input.contentLibrary,
    studentAccessPolicy: input.studentAccessPolicy,
    pendingTeamInvites: sanitizedInvites
  })

  if (groupedInvites.educators.length) {
    await inviteMembers({
      institutionId: institution.id,
      courseId: null,
      invitedByUserId: session.user.id,
      role: "EDUCATOR",
      rows: groupedInvites.educators.map((invite) => ({
        email: invite.email,
        name: invite.name
      }))
    })
  }

  if (groupedInvites.admins.length) {
    await inviteMembers({
      institutionId: institution.id,
      courseId: null,
      invitedByUserId: session.user.id,
      role: "INSTITUTION_ADMIN",
      rows: groupedInvites.admins.map((invite) => ({
        email: invite.email,
        name: invite.name
      }))
    })
  }

  return { success: true, redirectTo: "/institution/courses" }
}
