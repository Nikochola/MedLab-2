import crypto from "crypto"

import { parse } from "csv-parse/sync"

import { sendInviteEmail } from "@/server/institution/email"
import { supabaseAdmin } from "@/server/supabaseAdmin"

import type { InviteInputRow, InviteSummary, MemberRow } from "@/server/institution/types"

type CourseMembershipRecord = {
  id: string
  user_id: string
  role: "EDUCATOR" | "STUDENT"
  status: "ACTIVE" | "INVITED" | "DROPPED"
  created_at: string
}

type UserRecord = {
  id: string
  email: string
  full_name: string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value)
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function buildToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(16).toString("hex")
}

export function parseCsvRows(rawCsv: string) {
  return parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[]
}

export async function listMembers(input: {
  courseId: string
  role: "EDUCATOR" | "STUDENT"
}) {
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("course_memberships")
    .select("id,user_id,role,status,created_at")
    .eq("course_id", input.courseId)
    .eq("role", input.role)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })

  if (membershipError) {
    throw new Error(`Failed to list members: ${membershipError.message}`)
  }

  if (!memberships?.length) {
    return [] as MemberRow[]
  }
  const typedMemberships = memberships as CourseMembershipRecord[]

  const userIds = typedMemberships.map((membership) => membership.user_id)
  const { data: users, error: usersError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,full_name")
    .in("id", userIds)

  if (usersError) {
    throw new Error(`Failed to load users for member list: ${usersError.message}`)
  }

  const typedUsers = (users || []) as UserRecord[]
  const usersById = new Map(typedUsers.map((user) => [user.id, user]))

  return typedMemberships.map((membership) => {
    const user = usersById.get(membership.user_id)

    return {
      membership_id: membership.id,
      user_id: membership.user_id,
      email: user?.email || "",
      name: user?.full_name || null,
      avatar_url: null,
      role: membership.role,
      status: membership.status,
      created_at: membership.created_at
    }
  }) as MemberRow[]
}

async function hasPendingInvite(input: {
  institutionId: string
  courseId: string | null
  email: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"
}) {
  let query = supabaseAdmin
    .from("invites")
    .select("id")
    .eq("institution_id", input.institutionId)
    .eq("email", input.email)
    .eq("role", input.role)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)

  if (input.courseId) {
    query = query.eq("course_id", input.courseId)
  } else {
    query = query.is("course_id", null)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to inspect pending invite: ${error.message}`)
  }

  return Boolean(data?.length)
}

async function userAlreadyActiveInCourse(courseId: string, userId: string, role: "EDUCATOR" | "STUDENT") {
  const { data, error } = await supabaseAdmin
    .from("course_memberships")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .eq("role", role)
    .limit(1)

  if (error) {
    throw new Error(`Failed to inspect existing course membership: ${error.message}`)
  }

  return Boolean(data?.length)
}

async function userAlreadyActiveInInstitution(input: {
  institutionId: string
  userId: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"
}) {
  const { data, error } = await supabaseAdmin
    .from("institution_memberships")
    .select("id")
    .eq("institution_id", input.institutionId)
    .eq("user_id", input.userId)
    .eq("status", "ACTIVE")
    .eq("role", input.role)
    .limit(1)

  if (error) {
    throw new Error(`Failed to inspect existing institution membership: ${error.message}`)
  }

  return Boolean(data?.length)
}

export async function inviteMembers(input: {
  institutionId: string
  courseId: string | null
  invitedByUserId: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"
  rows: InviteInputRow[]
}) {
  const summary: InviteSummary = {
    role: input.role,
    total_rows: input.rows.length,
    invited_count: 0,
    skipped_count: 0,
    error_count: 0,
    results: []
  }

  if (!input.rows.length) {
    return summary
  }

  const { data: institution, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .select("name")
    .eq("id", input.institutionId)
    .maybeSingle()

  if (institutionError || !institution) {
    throw new Error(`Failed to load institution for invites: ${institutionError?.message || "Not found"}`)
  }
  const typedInstitution = institution as { name: string }

  let courseName: string | null = null
  if (input.courseId) {
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("name")
      .eq("id", input.courseId)
      .maybeSingle()

    if (courseError || !course) {
      throw new Error(`Failed to load course for invites: ${courseError?.message || "Not found"}`)
    }

    courseName = course.name
  }

  const seenEmails = new Set<string>()

  for (const row of input.rows) {
    const rawEmail = row.email || ""
    const email = normalizeEmail(rawEmail)

    if (!email || !isValidEmail(email)) {
      summary.error_count += 1
      summary.results.push({
        email: rawEmail || "(empty)",
        status: "ERROR",
        reason: "Invalid email"
      })
      continue
    }

    if (seenEmails.has(email)) {
      summary.skipped_count += 1
      summary.results.push({
        email,
        status: "SKIPPED",
        reason: "Duplicate email in upload"
      })
      continue
    }

    seenEmails.add(email)

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingUserError) {
      summary.error_count += 1
      summary.results.push({
        email,
        status: "ERROR",
        reason: existingUserError.message
      })
      continue
    }

    if (existingUser?.id) {
      const isAlreadyInstitutionMember = await userAlreadyActiveInInstitution({
        institutionId: input.institutionId,
        userId: existingUser.id,
        role: input.role
      })

      if (isAlreadyInstitutionMember && input.role === "INSTITUTION_ADMIN") {
        summary.skipped_count += 1
        summary.results.push({
          email,
          status: "SKIPPED",
          reason: "User is already an institution admin"
        })
        continue
      }

      if (
        input.courseId &&
        input.role !== "INSTITUTION_ADMIN" &&
        (await userAlreadyActiveInCourse(input.courseId, existingUser.id, input.role))
      ) {
        summary.skipped_count += 1
        summary.results.push({
          email,
          status: "SKIPPED",
          reason: "User is already active in this course"
        })
        continue
      }
    }

    const pendingInvite = await hasPendingInvite({
      institutionId: input.institutionId,
      courseId: input.role === "INSTITUTION_ADMIN" ? null : input.courseId,
      email,
      role: input.role
    })

    if (pendingInvite) {
      summary.skipped_count += 1
      summary.results.push({
        email,
        status: "SKIPPED",
        reason: "Pending invite already exists"
      })
      continue
    }

    const token = buildToken()
    const tokenHash = hashToken(token)

    const { data: inviteRow, error: inviteError } = await supabaseAdmin
      .from("invites")
      .insert({
        institution_id: input.institutionId,
        course_id: input.role === "INSTITUTION_ADMIN" ? null : input.courseId,
        email,
        role: input.role,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by_user_id: input.invitedByUserId,
        metadata: row.metadata || (row.name ? { name: row.name } : null),
        last_error: null
      })
      .select("id")
      .single()

    if (inviteError || !inviteRow) {
      summary.error_count += 1
      summary.results.push({
        email,
        status: "ERROR",
        reason: inviteError?.message || "Failed to create invite"
      })
      continue
    }

    const emailResult = await sendInviteEmail({
      email,
      token,
      role: input.role,
      institutionName: typedInstitution.name,
      courseName
    })

    if (!emailResult.sent) {
      await supabaseAdmin
        .from("invites")
        .update({ last_error: emailResult.error || "Failed to send invite email" })
        .eq("id", inviteRow.id)

      summary.error_count += 1
      summary.results.push({
        email,
        status: "ERROR",
        reason: emailResult.error || "Email delivery failed"
      })
      continue
    }

    summary.invited_count += 1
    summary.results.push({
      email,
      status: "INVITED"
    })
  }

  return summary
}

export async function removeMember(input: {
  courseId: string
  userId: string
  role: "EDUCATOR" | "STUDENT"
}) {
  const { error } = await supabaseAdmin
    .from("course_memberships")
    .update({ status: "DROPPED" })
    .eq("course_id", input.courseId)
    .eq("user_id", input.userId)
    .eq("role", input.role)

  if (error) {
    throw new Error(`Failed to remove member from course: ${error.message}`)
  }
}
