import crypto from "crypto"

import { supabaseAdmin } from "@/server/supabaseAdmin"

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function highestInstitutionRole(a: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT", b: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT") {
  const rank = {
    INSTITUTION_ADMIN: 3,
    EDUCATOR: 2,
    STUDENT: 1
  } as const

  return rank[a] >= rank[b] ? a : b
}

function highestCourseRole(a: "EDUCATOR" | "STUDENT", b: "EDUCATOR" | "STUDENT") {
  return a === "EDUCATOR" || b === "EDUCATOR" ? "EDUCATOR" : "STUDENT"
}

export async function getInviteByToken(token: string) {
  const tokenHash = hashToken(token)

  const { data, error } = await supabaseAdmin
    .from("invites")
    .select(
      "id,institution_id,course_id,email,role,expires_at,accepted_at,metadata,last_error,institutions(name),courses(name)"
    )
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load invite: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    ...data,
    institution_name: (data as any).institutions?.name || "Institution",
    course_name: (data as any).courses?.name || null
  }
}

export async function acceptInvite(input: {
  token: string
  userId: string
  userEmail: string
  userName?: string | null
}) {
  const invite = await getInviteByToken(input.token)

  if (!invite) {
    throw new Error("Invite link is invalid or expired")
  }

  const normalizedEmail = input.userEmail.trim().toLowerCase()

  if (normalizedEmail !== invite.email.toLowerCase()) {
    throw new Error("Please sign in using the invited email address")
  }

  const userPayload = {
    id: input.userId,
    email: normalizedEmail,
    full_name: input.userName || ((invite.metadata as any)?.name as string | undefined) || null
  }

  const { error: upsertUserError } = await supabaseAdmin
    .from("profiles")
    .upsert(userPayload, { onConflict: "id" })

  if (upsertUserError) {
    throw new Error(`Failed to upsert profile during invite acceptance: ${upsertUserError.message}`)
  }

  const { data: existingInstitutionMembership, error: existingInstitutionMembershipError } = await supabaseAdmin
    .from("institution_memberships")
    .select("role")
    .eq("institution_id", invite.institution_id)
    .eq("user_id", input.userId)
    .maybeSingle()

  if (existingInstitutionMembershipError) {
    throw new Error(`Failed to inspect existing institution membership: ${existingInstitutionMembershipError.message}`)
  }

  const institutionRole = existingInstitutionMembership?.role
    ? highestInstitutionRole(existingInstitutionMembership.role, invite.role)
    : invite.role

  const { error: upsertInstitutionMembershipError } = await supabaseAdmin
    .from("institution_memberships")
    .upsert(
      {
        institution_id: invite.institution_id,
        user_id: input.userId,
        role: institutionRole,
        status: "ACTIVE"
      },
      { onConflict: "institution_id,user_id" }
    )

  if (upsertInstitutionMembershipError) {
    throw new Error(`Failed to create institution membership: ${upsertInstitutionMembershipError.message}`)
  }

  if (invite.course_id && (invite.role === "EDUCATOR" || invite.role === "STUDENT")) {
    const { data: existingCourseMembership, error: existingCourseMembershipError } = await supabaseAdmin
      .from("course_memberships")
      .select("role")
      .eq("course_id", invite.course_id)
      .eq("user_id", input.userId)
      .maybeSingle()

    if (existingCourseMembershipError) {
      throw new Error(`Failed to inspect existing course membership: ${existingCourseMembershipError.message}`)
    }

    const courseRole = existingCourseMembership?.role
      ? highestCourseRole(existingCourseMembership.role, invite.role)
      : invite.role

    const { error: upsertCourseMembershipError } = await supabaseAdmin
      .from("course_memberships")
      .upsert(
        {
          course_id: invite.course_id,
          user_id: input.userId,
          role: courseRole,
          status: "ACTIVE"
        },
        { onConflict: "course_id,user_id" }
      )

    if (upsertCourseMembershipError) {
      throw new Error(`Failed to create course membership: ${upsertCourseMembershipError.message}`)
    }
  }

  const { error: markAcceptedError } = await supabaseAdmin
    .from("invites")
    .update({ accepted_at: new Date().toISOString(), last_error: null })
    .eq("id", invite.id)

  if (markAcceptedError) {
    throw new Error(`Failed to mark invite as accepted: ${markAcceptedError.message}`)
  }

  if (invite.role === "INSTITUTION_ADMIN" || invite.role === "EDUCATOR") {
    return "/institution/courses"
  }

  return "/learn"
}
