import crypto from "crypto"

import { ALL_TRACKS } from "@/lib/tracks/trackData"
import { hasEnterpriseAccess, listPublishedEnterpriseCases } from "@/server/institution/enterprise"
import { INVITE_TTL_MS } from "@/server/institution/members"
import { sendInviteEmail } from "@/server/institution/email"
import { supabaseAdmin } from "@/server/supabaseAdmin"

import type { InstitutionContext, InstitutionRole } from "@/server/institution/types"

type StaffRole = "INSTITUTION_ADMIN" | "EDUCATOR"

export type StarterCourse = {
  id: string
  name: string
  code: string | null
  term: string | null
  studentCount: number
  educatorCount: number
}

export type StarterPerson = {
  userId: string
  email: string
  name: string | null
  role: "EDUCATOR" | "STUDENT"
  joinedAt: string
  courses: Array<{ id: string; name: string }>
  educatorAssignments: Array<{ courseId: string; educatorUserId: string; educatorName: string | null }>
  assignedStudentCount: number
}

export type StarterAssignment = {
  id: string
  institutionId: string
  courseId: string
  courseName: string
  title: string
  instructions: string | null
  caseIds: string[]
  dueAt: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  createdAt: string
  assignedCount: number
  completedCount: number
}

export const STARTER_PRACTICE_LIBRARY = ALL_TRACKS.flatMap((track) =>
  track.units.map((unit) => ({
    id: unit.id,
    trackId: track.id,
    trackTitle: track.title,
    modality: track.modality,
    title: unit.title,
    type: unit.type,
    difficulty: unit.difficulty,
    durationMin: unit.durationMin,
    href: `/learn/${track.id}/${unit.id}`
  }))
)

export const STARTER_CASE_LIBRARY = STARTER_PRACTICE_LIBRARY.filter((unit) => unit.type === "case")

export async function listInstitutionAssignableCases(context: InstitutionContext) {
  if (!hasEnterpriseAccess(context)) return STARTER_CASE_LIBRARY
  const customCases = await listPublishedEnterpriseCases(context.institution.id)
  return [
    ...STARTER_CASE_LIBRARY,
    ...customCases.map((item) => ({
      id: `institution:${item.id}`,
      trackId: "institution-authored",
      trackTitle: context.institution.name,
      modality: item.modality,
      title: item.title,
      type: "case" as const,
      difficulty: item.difficulty,
      durationMin: item.durationMin,
      href: item.href
    }))
  ]
}

const starterPracticeMap = new Map(STARTER_PRACTICE_LIBRARY.map((unit) => [unit.id, unit]))

function practiceLabel(caseId: string) {
  const item = starterPracticeMap.get(caseId)
  if (item) return { title: item.title, modality: item.modality }
  return {
    title: caseId
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    modality: null
  }
}

async function customPracticeLabels(caseIds: string[]) {
  const ids = Array.from(new Set(caseIds.filter((id) => id.startsWith("institution:")).map((id) => id.slice("institution:".length)).filter(Boolean)))
  if (!ids.length) return new Map<string, { title: string; modality: string | null }>()
  const { data, error } = await supabaseAdmin.from("institution_cases").select("id,title,modality").in("id", ids)
  if (error && starterSchemaPending(error)) return new Map()
  if (error) throw new Error(`Failed to load custom case labels: ${error.message}`)
  return new Map((data || []).map((item) => [`institution:${item.id}`, { title: String(item.title), modality: String(item.modality) }]))
}

function starterSchemaPending(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message || ""
  return error?.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("Could not find") ||
    message.includes("schema cache")
}

function isAdmin(role: InstitutionRole) {
  return role === "INSTITUTION_ADMIN"
}

async function accessibleCourseIds(context: InstitutionContext) {
  if (isAdmin(context.membership.role)) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("institution_id", context.institution.id)
      .eq("is_archived", false)

    if (error) throw new Error(`Failed to load classes: ${error.message}`)
    return (data || []).map((row) => String(row.id))
  }

  const { data, error } = await supabaseAdmin
    .from("course_memberships")
    .select("course_id")
    .eq("user_id", context.membership.user_id)
    .eq("role", "EDUCATOR")
    .eq("status", "ACTIVE")

  if (error) throw new Error(`Failed to load educator classes: ${error.message}`)
  return (data || []).map((row) => String(row.course_id))
}

export async function listStarterCourses(context: InstitutionContext): Promise<StarterCourse[]> {
  const courseIds = await accessibleCourseIds(context)
  if (!courseIds.length) return []

  const [{ data: courses, error: courseError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabaseAdmin
      .from("courses")
      .select("id,name,code,term")
      .in("id", courseIds)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("course_memberships")
      .select("course_id,role,user_id")
      .in("course_id", courseIds)
      .eq("status", "ACTIVE")
  ])

  if (courseError) throw new Error(`Failed to load classes: ${courseError.message}`)
  if (membershipError) throw new Error(`Failed to load class rosters: ${membershipError.message}`)

  return (courses || []).map((course) => ({
    id: String(course.id),
    name: String(course.name),
    code: course.code ? String(course.code) : null,
    term: course.term ? String(course.term) : null,
    studentCount: (memberships || []).filter((row) => row.course_id === course.id && row.role === "STUDENT").length,
    educatorCount: (memberships || []).filter((row) => row.course_id === course.id && row.role === "EDUCATOR").length
  }))
}

export async function getStarterOverview(context: InstitutionContext) {
  const courses = await listStarterCourses(context)
  const courseIds = courses.map((course) => course.id)

  if (!courseIds.length) {
    return {
      courses,
      studentCount: 0,
      educatorCount: 0,
      totalAttempts: 0,
      averageScore: null as number | null,
      pendingInvites: 0,
      activeAssignments: 0,
      recentAttempts: [] as Array<{ id: string; studentName: string | null; caseId: string; caseTitle: string; score: number | null; createdAt: string }>
    }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: courseMembers }, { data: attempts }, { count: pendingInvites }, { data: publishedAssignments }] = await Promise.all([
    supabaseAdmin
      .from("course_memberships")
      .select("user_id,role,course_id")
      .in("course_id", courseIds)
      .eq("status", "ACTIVE"),
    supabaseAdmin
      .from("case_attempts")
      .select("id,user_id,case_id,score,created_at,course_id")
      .in("course_id", courseIds)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", context.institution.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabaseAdmin
      .from("case_assignments")
      .select("id")
      .in("course_id", courseIds)
      .eq("status", "PUBLISHED")
  ])

  let visibleAttempts = attempts || []
  let educatorOwnedIds: Set<string> | null = null
  let visibleActiveAssignmentCount = (publishedAssignments || []).length
  if (context.membership.role === "EDUCATOR") {
    const { data: ownedStudents, error: ownershipError } = await supabaseAdmin
      .from("educator_student_assignments")
      .select("student_user_id")
      .in("course_id", courseIds)
      .eq("educator_user_id", context.membership.user_id)
    if (ownershipError && !starterSchemaPending(ownershipError)) throw new Error(`Failed to load educator roster: ${ownershipError.message}`)
    educatorOwnedIds = new Set((ownershipError ? [] : ownedStudents || []).map((row) => String(row.student_user_id)))
    visibleAttempts = visibleAttempts.filter((attempt) => educatorOwnedIds?.has(String(attempt.user_id)))

    const publishedAssignmentIds = (publishedAssignments || []).map((assignment) => String(assignment.id))
    if (publishedAssignmentIds.length && educatorOwnedIds.size) {
      const { data: visibleTargets, error: targetError } = await supabaseAdmin
        .from("case_assignment_students")
        .select("assignment_id")
        .in("assignment_id", publishedAssignmentIds)
        .in("student_user_id", Array.from(educatorOwnedIds))
      if (targetError) throw new Error(`Failed to load assignment progress: ${targetError.message}`)
      visibleActiveAssignmentCount = new Set((visibleTargets || []).map((target) => String(target.assignment_id))).size
    } else {
      visibleActiveAssignmentCount = 0
    }
  }

  const studentIds = Array.from(new Set(visibleAttempts.slice(0, 8).map((attempt) => String(attempt.user_id))))
  const { data: profiles } = studentIds.length
    ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", studentIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> }
  const names = new Map((profiles || []).map((profile) => [String(profile.id), profile.full_name ? String(profile.full_name) : null]))
  const scoredAttempts = visibleAttempts.filter((attempt) => typeof attempt.score === "number")
  const customLabels = await customPracticeLabels(visibleAttempts.slice(0, 8).map((attempt) => String(attempt.case_id)))
  const labelFor = (caseId: string) => customLabels.get(caseId) || practiceLabel(caseId)

  const memberRows = courseMembers || []
  const visibleStudentIds = context.membership.role === "EDUCATOR"
    ? educatorOwnedIds || new Set<string>()
    : new Set(memberRows.filter((row) => row.role === "STUDENT").map((row) => String(row.user_id)))

  return {
    courses,
    studentCount: visibleStudentIds.size,
    educatorCount: new Set(memberRows.filter((row) => row.role === "EDUCATOR").map((row) => String(row.user_id))).size,
    totalAttempts: visibleAttempts.length,
    averageScore: scoredAttempts.length
      ? Number((scoredAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scoredAttempts.length).toFixed(1))
      : null,
    pendingInvites: pendingInvites || 0,
    activeAssignments: visibleActiveAssignmentCount,
    recentAttempts: visibleAttempts.slice(0, 8).map((attempt) => ({
      id: String(attempt.id),
      studentName: names.get(String(attempt.user_id)) || null,
      caseId: String(attempt.case_id),
      caseTitle: labelFor(String(attempt.case_id)).title,
      score: typeof attempt.score === "number" ? Number(attempt.score) : null,
      createdAt: String(attempt.created_at)
    }))
  }
}

export async function listStarterPeople(context: InstitutionContext): Promise<StarterPerson[]> {
  const courses = await listStarterCourses(context)
  const courseIds = courses.map((course) => course.id)
  if (!courseIds.length) return []

  const { data: courseMemberships, error: courseMembershipError } = await supabaseAdmin
    .from("course_memberships")
    .select("course_id,user_id,role,created_at")
    .in("course_id", courseIds)
    .eq("status", "ACTIVE")

  if (courseMembershipError) throw new Error(`Failed to load people: ${courseMembershipError.message}`)

  const userIds = Array.from(new Set((courseMemberships || []).map((row) => String(row.user_id))))
  if (!userIds.length) return []

  const [{ data: profiles, error: profileError }, { data: ownerships, error: ownershipError }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,email,full_name").in("id", userIds),
    supabaseAdmin
      .from("educator_student_assignments")
      .select("course_id,educator_user_id,student_user_id")
      .in("course_id", courseIds)
  ])

  if (profileError) throw new Error(`Failed to load profiles: ${profileError.message}`)
  if (ownershipError && !starterSchemaPending(ownershipError)) throw new Error(`Failed to load teacher assignments: ${ownershipError.message}`)

  const courseNames = new Map(courses.map((course) => [course.id, course.name]))
  const profileMap = new Map((profiles || []).map((profile) => [String(profile.id), profile]))
  const ownedStudentIds = new Set(
    (ownershipError ? [] : ownerships || [])
      .filter((row) => String(row.educator_user_id) === context.membership.user_id)
      .map((row) => String(row.student_user_id))
  )

  return userIds.map<StarterPerson>((userId) => {
    const memberships = (courseMemberships || []).filter((row) => String(row.user_id) === userId)
    const role: StarterPerson["role"] = memberships.some((row) => row.role === "EDUCATOR") ? "EDUCATOR" : "STUDENT"
    const profile = profileMap.get(userId)
    const studentOwnerships = role === "STUDENT"
      ? (ownershipError ? [] : ownerships || []).filter((row) => String(row.student_user_id) === userId)
      : []

    return {
      userId,
      email: profile?.email ? String(profile.email) : "",
      name: profile?.full_name ? String(profile.full_name) : null,
      role,
      joinedAt: String(memberships[0]?.created_at || new Date(0).toISOString()),
      courses: memberships.map((membership) => ({
        id: String(membership.course_id),
        name: courseNames.get(String(membership.course_id)) || "Class"
      })),
      educatorAssignments: studentOwnerships.map((ownership) => {
        const educator = profileMap.get(String(ownership.educator_user_id))
        return {
          courseId: String(ownership.course_id),
          educatorUserId: String(ownership.educator_user_id),
          educatorName: educator?.full_name ? String(educator.full_name) : null
        }
      }),
      assignedStudentCount: role === "EDUCATOR"
        ? (ownerships || []).filter((row) => String(row.educator_user_id) === userId).length
        : 0
    }
  }).filter((person) => {
    if (context.membership.role !== "EDUCATOR") return true
    if (person.userId === context.membership.user_id) return true
    return person.role === "STUDENT" && ownedStudentIds.has(person.userId)
  })
}

export async function setStudentEducator(input: {
  context: InstitutionContext
  courseId: string
  studentUserId: string
  educatorUserId: string | null
}) {
  if (!isAdmin(input.context.membership.role)) throw new Error("Only institution administrators can assign students")

  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id,institution_id")
    .eq("id", input.courseId)
    .eq("institution_id", input.context.institution.id)
    .maybeSingle()

  if (courseError || !course) throw new Error("Class not found")

  const { data: members, error: memberError } = await supabaseAdmin
    .from("course_memberships")
    .select("user_id,role,status")
    .eq("course_id", input.courseId)
    .in("user_id", [input.studentUserId, input.educatorUserId || input.studentUserId])
    .eq("status", "ACTIVE")

  if (memberError) throw new Error(`Failed to validate class members: ${memberError.message}`)
  if (!(members || []).some((row) => row.user_id === input.studentUserId && row.role === "STUDENT")) {
    throw new Error("Student is not active in this class")
  }

  if (!input.educatorUserId) {
    const { error } = await supabaseAdmin
      .from("educator_student_assignments")
      .delete()
      .eq("course_id", input.courseId)
      .eq("student_user_id", input.studentUserId)
    if (error) throw new Error(`Failed to clear teacher assignment: ${error.message}`)
    return
  }

  if (!(members || []).some((row) => row.user_id === input.educatorUserId && row.role === "EDUCATOR")) {
    throw new Error("Educator is not active in this class")
  }

  const { error } = await supabaseAdmin.from("educator_student_assignments").upsert({
    institution_id: input.context.institution.id,
    course_id: input.courseId,
    educator_user_id: input.educatorUserId,
    student_user_id: input.studentUserId,
    created_by_user_id: input.context.membership.user_id
  }, { onConflict: "course_id,student_user_id" })

  if (error) throw new Error(`Failed to assign teacher: ${error.message}`)
}

export async function listStarterAssignments(context: InstitutionContext): Promise<StarterAssignment[]> {
  const courses = await listStarterCourses(context)
  const courseIds = courses.map((course) => course.id)
  if (!courseIds.length) return []

  const { data: assignments, error } = await supabaseAdmin
    .from("case_assignments")
    .select("id,institution_id,course_id,title,instructions,case_ids,due_at,status,created_at")
    .in("course_id", courseIds)
    .neq("status", "ARCHIVED")
    .order("created_at", { ascending: false })

  if (error && starterSchemaPending(error)) return []
  if (error) throw new Error(`Failed to load assignments: ${error.message}`)

  const assignmentIds = (assignments || []).map((assignment) => String(assignment.id))
  const { data: targets } = assignmentIds.length
    ? await supabaseAdmin
      .from("case_assignment_students")
      .select("assignment_id,student_user_id,status")
      .in("assignment_id", assignmentIds)
    : { data: [] as Array<{ assignment_id: string; student_user_id: string; status: string }> }
  const courseNames = new Map(courses.map((course) => [course.id, course.name]))
  const { data: educatorOwnerships } = context.membership.role === "EDUCATOR"
    ? await supabaseAdmin
      .from("educator_student_assignments")
      .select("course_id,student_user_id")
      .in("course_id", courseIds)
      .eq("educator_user_id", context.membership.user_id)
    : { data: [] as Array<{ course_id: string; student_user_id: string }> }
  const ownedStudentsByCourse = new Map<string, Set<string>>()
  for (const ownership of educatorOwnerships || []) {
    const courseId = String(ownership.course_id)
    const owned = ownedStudentsByCourse.get(courseId) || new Set<string>()
    owned.add(String(ownership.student_user_id))
    ownedStudentsByCourse.set(courseId, owned)
  }

  return (assignments || []).map((assignment) => {
    const ownedStudents = ownedStudentsByCourse.get(String(assignment.course_id))
    const assignmentTargets = (targets || []).filter((target) =>
      target.assignment_id === assignment.id &&
      (context.membership.role !== "EDUCATOR" || ownedStudents?.has(String(target.student_user_id)))
    )
    return {
      id: String(assignment.id),
      institutionId: String(assignment.institution_id),
      courseId: String(assignment.course_id),
      courseName: courseNames.get(String(assignment.course_id)) || "Class",
      title: String(assignment.title),
      instructions: assignment.instructions ? String(assignment.instructions) : null,
      caseIds: Array.isArray(assignment.case_ids) ? assignment.case_ids.map(String) : [],
      dueAt: assignment.due_at ? String(assignment.due_at) : null,
      status: assignment.status as StarterAssignment["status"],
      createdAt: String(assignment.created_at),
      assignedCount: assignmentTargets.length,
      completedCount: assignmentTargets.filter((target) => target.status === "COMPLETED").length
    }
  }).filter((assignment) => context.membership.role !== "EDUCATOR" || assignment.assignedCount > 0)
}

export async function createStarterAssignment(input: {
  context: InstitutionContext
  courseId: string
  title: string
  instructions?: string | null
  caseIds: string[]
  dueAt?: string | null
}) {
  const allowedCourses = await accessibleCourseIds(input.context)
  if (!allowedCourses.includes(input.courseId)) throw new Error("You cannot create assignments for this class")

  const title = input.title.trim()
  if (!title) throw new Error("Assignment title is required")

  const validCaseIds = new Set((await listInstitutionAssignableCases(input.context)).map((item) => item.id))
  const caseIds = Array.from(new Set(input.caseIds.filter((id) => validCaseIds.has(id))))
  if (!caseIds.length) throw new Error("Select at least one case")

  const { data: students, error: studentError } = await supabaseAdmin
    .from("course_memberships")
    .select("user_id")
    .eq("course_id", input.courseId)
    .eq("role", "STUDENT")
    .eq("status", "ACTIVE")
  if (studentError) throw new Error(`Students could not be loaded: ${studentError.message}`)

  let studentIds = (students || []).map((student) => String(student.user_id))
  if (input.context.membership.role === "EDUCATOR") {
    const { data: ownedStudents, error: ownershipError } = await supabaseAdmin
      .from("educator_student_assignments")
      .select("student_user_id")
      .eq("course_id", input.courseId)
      .eq("educator_user_id", input.context.membership.user_id)
    if (ownershipError) throw new Error(`Teacher ownership could not be resolved: ${ownershipError.message}`)
    const ownedIds = new Set((ownedStudents || []).map((row) => String(row.student_user_id)))
    studentIds = studentIds.filter((id) => ownedIds.has(id))
  }

  if (!studentIds.length) throw new Error("This class has no students available for this assignment")

  const { data: assignment, error } = await supabaseAdmin
    .from("case_assignments")
    .insert({
      institution_id: input.context.institution.id,
      course_id: input.courseId,
      title,
      instructions: input.instructions?.trim() || null,
      case_ids: caseIds,
      due_at: input.dueAt || null,
      status: "PUBLISHED",
      created_by_user_id: input.context.membership.user_id
    })
    .select("id")
    .single()

  if (error || !assignment) throw new Error(`Failed to create assignment: ${error?.message || "Unknown error"}`)

  const { error: targetError } = await supabaseAdmin.from("case_assignment_students").insert(
    studentIds.map((studentUserId) => ({ assignment_id: assignment.id, student_user_id: studentUserId }))
  )
  if (targetError) {
    await supabaseAdmin.from("case_assignments").delete().eq("id", assignment.id)
    throw new Error(`Students could not be assigned: ${targetError.message}`)
  }

  return String(assignment.id)
}

export async function archiveStarterAssignment(context: InstitutionContext, assignmentId: string) {
  const allowedCourseIds = await accessibleCourseIds(context)
  let query = supabaseAdmin
    .from("case_assignments")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("institution_id", context.institution.id)
    .in("course_id", allowedCourseIds)
  if (context.membership.role === "EDUCATOR") {
    query = query.eq("created_by_user_id", context.membership.user_id)
  }
  const { error } = await query

  if (error) throw new Error(`Failed to archive assignment: ${error.message}`)
}

export async function listPendingInstitutionInvites(context: InstitutionContext) {
  if (!isAdmin(context.membership.role)) return []

  const { data, error } = await supabaseAdmin
    .from("invites")
    .select("id,course_id,email,role,expires_at,created_at,last_error,courses(name)")
    .eq("institution_id", context.institution.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to load pending invitations: ${error.message}`)
  const now = Date.now()
  return (data || []).map((invite) => ({
    id: String(invite.id),
    email: String(invite.email),
    role: String(invite.role),
    courseId: invite.course_id ? String(invite.course_id) : null,
    courseName: (invite as any).courses?.name ? String((invite as any).courses.name) : null,
    expiresAt: String(invite.expires_at),
    createdAt: String(invite.created_at),
    deliveryError: invite.last_error ? String(invite.last_error) : null,
    expired: new Date(String(invite.expires_at)).getTime() <= now
  }))
}

export async function revokeInstitutionInvite(context: InstitutionContext, inviteId: string) {
  if (!isAdmin(context.membership.role)) throw new Error("Only institution administrators can revoke invitations")
  const { error } = await supabaseAdmin
    .from("invites")
    .update({ expires_at: new Date(0).toISOString(), last_error: "Revoked by institution administrator" })
    .eq("id", inviteId)
    .eq("institution_id", context.institution.id)
    .is("accepted_at", null)
  if (error) throw new Error(`Failed to revoke invitation: ${error.message}`)
}

export async function resendInstitutionInvite(context: InstitutionContext, inviteId: string) {
  if (!isAdmin(context.membership.role)) throw new Error("Only institution administrators can resend invitations")

  const { data: invite, error } = await supabaseAdmin
    .from("invites")
    .select("id,email,role,course_id,institutions(name),courses(name)")
    .eq("id", inviteId)
    .eq("institution_id", context.institution.id)
    .is("accepted_at", null)
    .maybeSingle()
  if (error || !invite) throw new Error("Invitation not found")

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(16).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()
  const institutionName = (invite as any).institutions?.name || context.institution.name
  const courseName = (invite as any).courses?.name || null

  const emailResult = await sendInviteEmail({
    email: String(invite.email),
    token,
    role: invite.role as "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT",
    institutionName,
    courseName
  })

  const { error: updateError } = await supabaseAdmin
    .from("invites")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      last_error: emailResult.sent ? null : emailResult.error
    })
    .eq("id", inviteId)

  if (updateError) throw new Error(`Failed to refresh invitation: ${updateError.message}`)
  if (!emailResult.sent) throw new Error(emailResult.error || "Invitation email could not be sent")
}

export async function getStarterAnalytics(context: InstitutionContext, courseId?: string | null) {
  const accessibleCourses = await listStarterCourses(context)
  const courses = courseId ? accessibleCourses.filter((course) => course.id === courseId) : accessibleCourses
  const courseIds = courses.map((course) => course.id)
  if (!courseIds.length) return { courses, attempts: [], students: [], daily: [], weakestCases: [] }

  let { data: attempts, error } = await supabaseAdmin
    .from("case_attempts")
    .select("id,user_id,course_id,assignment_id,case_id,modality,score,is_correct,duration_sec,metadata,created_at")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .limit(5000)
  if (error && starterSchemaPending(error)) {
    const legacyResult = await supabaseAdmin
      .from("case_attempts")
      .select("id,user_id,course_id,case_id,score,is_correct,duration_sec,created_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(5000)
    attempts = legacyResult.data as typeof attempts
    error = legacyResult.error
  }
  if (error) throw new Error(`Failed to load analytics: ${error.message}`)

  let visibleStudentIds: string[] = []
  if (context.membership.role === "EDUCATOR") {
    const { data: ownerships, error: ownershipError } = await supabaseAdmin
      .from("educator_student_assignments")
      .select("student_user_id")
      .in("course_id", courseIds)
      .eq("educator_user_id", context.membership.user_id)
    if (ownershipError && !starterSchemaPending(ownershipError)) throw new Error(`Failed to load educator roster: ${ownershipError.message}`)
    visibleStudentIds = Array.from(new Set((ownershipError ? [] : ownerships || []).map((row) => String(row.student_user_id))))
  } else {
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("course_memberships")
      .select("user_id")
      .in("course_id", courseIds)
      .eq("role", "STUDENT")
      .eq("status", "ACTIVE")
    if (membershipError) throw new Error(`Failed to load student roster: ${membershipError.message}`)
    visibleStudentIds = Array.from(new Set((memberships || []).map((row) => String(row.user_id))))
  }

  const visibleStudents = new Set(visibleStudentIds)
  const visibleAttempts = (attempts || []).filter((attempt) => visibleStudents.has(String(attempt.user_id)))
  const customLabels = await customPracticeLabels(visibleAttempts.map((attempt) => String(attempt.case_id)))
  const labelFor = (caseId: string) => customLabels.get(caseId) || practiceLabel(caseId)
  const { data: profiles, error: profilesError } = visibleStudentIds.length
    ? await supabaseAdmin.from("profiles").select("id,email,full_name").in("id", visibleStudentIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> }
  if (profilesError) throw new Error(`Failed to load student profiles: ${profilesError.message}`)

  const { data: assignmentRows, error: assignmentError } = await supabaseAdmin
    .from("case_assignments")
    .select("id")
    .in("course_id", courseIds)
    .neq("status", "ARCHIVED")
  if (assignmentError && !starterSchemaPending(assignmentError)) {
    throw new Error(`Failed to load assignment analytics: ${assignmentError.message}`)
  }
  const assignments = assignmentError ? [] : assignmentRows || []
  const assignmentIds = (assignments || []).map((assignment) => String(assignment.id))
  const { data: assignmentTargets, error: targetError } = assignmentIds.length && visibleStudentIds.length
    ? await supabaseAdmin
      .from("case_assignment_students")
      .select("assignment_id,student_user_id,status")
      .in("assignment_id", assignmentIds)
      .in("student_user_id", visibleStudentIds)
    : { data: [] as Array<{ assignment_id: string; student_user_id: string; status: string }>, error: null }
  if (targetError && !starterSchemaPending(targetError)) {
    throw new Error(`Failed to load student assignment progress: ${targetError.message}`)
  }

  const profileMap = new Map((profiles || []).map((profile) => [String(profile.id), profile]))
  const courseMap = new Map(courses.map((course) => [course.id, course.name]))

  const studentMap = new Map<string, { attempts: number; scoreTotal: number; scoreCount: number; lastActive: string | null; assignmentsAssigned: number; assignmentsCompleted: number }>(
    visibleStudentIds.map((studentId) => [studentId, { attempts: 0, scoreTotal: 0, scoreCount: 0, lastActive: null, assignmentsAssigned: 0, assignmentsCompleted: 0 }])
  )
  const dayMap = new Map<string, { attempts: number; scoreTotal: number; scoreCount: number }>()
  const caseMap = new Map<string, { attempts: number; scoreTotal: number; scoreCount: number }>()

  for (const target of targetError ? [] : assignmentTargets || []) {
    const student = studentMap.get(String(target.student_user_id))
    if (!student) continue
    student.assignmentsAssigned += 1
    if (target.status === "COMPLETED") student.assignmentsCompleted += 1
  }

  for (const attempt of visibleAttempts) {
    const userId = String(attempt.user_id)
    const student = studentMap.get(userId) || { attempts: 0, scoreTotal: 0, scoreCount: 0, lastActive: null, assignmentsAssigned: 0, assignmentsCompleted: 0 }
    student.attempts += 1
    if (!student.lastActive) student.lastActive = String(attempt.created_at)
    if (typeof attempt.score === "number") { student.scoreTotal += Number(attempt.score); student.scoreCount += 1 }
    studentMap.set(userId, student)

    const dayKey = new Date(String(attempt.created_at)).toISOString().slice(0, 10)
    const day = dayMap.get(dayKey) || { attempts: 0, scoreTotal: 0, scoreCount: 0 }
    day.attempts += 1
    if (typeof attempt.score === "number") { day.scoreTotal += Number(attempt.score); day.scoreCount += 1 }
    dayMap.set(dayKey, day)

    const caseKey = String(attempt.case_id)
    const caseEntry = caseMap.get(caseKey) || { attempts: 0, scoreTotal: 0, scoreCount: 0 }
    caseEntry.attempts += 1
    if (typeof attempt.score === "number") { caseEntry.scoreTotal += Number(attempt.score); caseEntry.scoreCount += 1 }
    caseMap.set(caseKey, caseEntry)
  }

  return {
    courses,
    attempts: visibleAttempts.map((attempt) => ({
      id: String(attempt.id),
      studentId: String(attempt.user_id),
      studentName: profileMap.get(String(attempt.user_id))?.full_name || profileMap.get(String(attempt.user_id))?.email || "Student",
      studentEmail: profileMap.get(String(attempt.user_id))?.email || "",
      courseId: String(attempt.course_id),
      courseName: courseMap.get(String(attempt.course_id)) || "Class",
      caseId: String(attempt.case_id),
      caseTitle: labelFor(String(attempt.case_id)).title,
      modality: attempt.modality ? String(attempt.modality) : labelFor(String(attempt.case_id)).modality,
      assignmentId: attempt.assignment_id ? String(attempt.assignment_id) : null,
      score: typeof attempt.score === "number" ? Number(attempt.score) : null,
      isCorrect: typeof attempt.is_correct === "boolean" ? attempt.is_correct : null,
      source: attempt.metadata !== null && typeof attempt.metadata === "object" && "source" in attempt.metadata
        ? String((attempt.metadata as Record<string, unknown>).source)
        : null,
      scoreSource: attempt.metadata !== null && typeof attempt.metadata === "object" && "scoreSource" in attempt.metadata
        ? String((attempt.metadata as Record<string, unknown>).scoreSource)
        : null,
      durationSec: typeof attempt.duration_sec === "number" ? Number(attempt.duration_sec) : null,
      createdAt: String(attempt.created_at)
    })),
    students: Array.from(studentMap.entries()).map(([studentId, value]) => ({
      studentId,
      name: profileMap.get(studentId)?.full_name || profileMap.get(studentId)?.email || "Student",
      email: profileMap.get(studentId)?.email || "",
      attempts: value.attempts,
      averageScore: value.scoreCount ? Number((value.scoreTotal / value.scoreCount).toFixed(1)) : null,
      lastActive: value.lastActive,
      assignmentsAssigned: value.assignmentsAssigned,
      assignmentsCompleted: value.assignmentsCompleted,
      assignmentCompletion: value.assignmentsAssigned
        ? Number(((value.assignmentsCompleted / value.assignmentsAssigned) * 100).toFixed(1))
        : null
    })).sort((a, b) => b.attempts - a.attempts),
    daily: Array.from(dayMap.entries()).map(([date, value]) => ({
      date,
      attempts: value.attempts,
      averageScore: value.scoreCount ? Number((value.scoreTotal / value.scoreCount).toFixed(1)) : null
    })).sort((a, b) => a.date.localeCompare(b.date)),
    weakestCases: Array.from(caseMap.entries()).map(([caseId, value]) => ({
      caseId,
      caseTitle: labelFor(caseId).title,
      modality: labelFor(caseId).modality,
      attempts: value.attempts,
      averageScore: value.scoreCount ? Number((value.scoreTotal / value.scoreCount).toFixed(1)) : null
    })).sort((a, b) => (a.averageScore ?? 101) - (b.averageScore ?? 101)).slice(0, 8)
  }
}

export async function recordInstitutionAttempt(input: {
  userId: string
  caseId: string
  courseId?: string | null
  attemptId?: string | null
  score?: number | null
  isCorrect?: boolean | null
  durationSec?: number | null
  modality?: string | null
  metadata?: Record<string, unknown>
}) {
  const caseId = input.caseId.trim().slice(0, 160)
  if (!caseId) throw new Error("A case identifier is required")
  const clientAttemptId = input.attemptId?.trim().slice(0, 160) || null
  const score = typeof input.score === "number" && Number.isFinite(input.score)
    ? Math.max(0, Math.min(100, Math.round(input.score)))
    : null
  const durationSec = typeof input.durationSec === "number" && Number.isFinite(input.durationSec)
    ? Math.max(0, Math.min(24 * 60 * 60, Math.round(input.durationSec)))
    : null

  const { data: courseMemberships, error: courseMembershipError } = await supabaseAdmin
    .from("course_memberships")
    .select("course_id")
    .eq("user_id", input.userId)
    .eq("role", "STUDENT")
    .eq("status", "ACTIVE")
  if (courseMembershipError) throw new Error(`Failed to resolve student classes: ${courseMembershipError.message}`)
  let courseIds = Array.from(new Set((courseMemberships || []).map((row) => String(row.course_id))))
  if (input.courseId) courseIds = courseIds.filter((courseId) => courseId === input.courseId)
  if (!courseIds.length) return null

  const [{ data: courses, error: courseError }, { data: targets, error: targetError }] = await Promise.all([
    supabaseAdmin
      .from("courses")
      .select("id,institution_id")
      .in("id", courseIds)
      .eq("is_archived", false),
    supabaseAdmin
      .from("case_assignment_students")
      .select("assignment_id,case_assignments!inner(id,course_id,case_ids,status)")
      .eq("student_user_id", input.userId)
      .in("case_assignments.course_id", courseIds)
      .eq("case_assignments.status", "PUBLISHED")
  ])
  if (courseError) throw new Error(`Failed to resolve student classes: ${courseError.message}`)
  if (targetError) throw new Error(`Failed to resolve case assignments: ${targetError.message}`)

  const institutionIds = Array.from(new Set((courses || []).map((course) => String(course.institution_id))))
  const { data: institutionMemberships, error: institutionMembershipError } = institutionIds.length
    ? await supabaseAdmin
      .from("institution_memberships")
      .select("institution_id")
      .in("institution_id", institutionIds)
      .eq("user_id", input.userId)
      .eq("role", "STUDENT")
      .eq("status", "ACTIVE")
    : { data: [] as Array<{ institution_id: string }>, error: null }
  if (institutionMembershipError) throw new Error(`Failed to resolve institution access: ${institutionMembershipError.message}`)
  const activeInstitutionIds = new Set((institutionMemberships || []).map((membership) => String(membership.institution_id)))
  const activeCourses = (courses || []).filter((course) => activeInstitutionIds.has(String(course.institution_id)))
  if (!activeCourses.length) return null

  const matchingTargets = (targets || []).filter((target) => {
    const assignment = (target as any).case_assignments
    return Array.isArray(assignment?.case_ids) && assignment.case_ids.map(String).includes(caseId)
  }) as any[]

  const attemptIds: string[] = []
  for (const course of activeCourses) {
    const courseId = String(course.id)
    const matchingTarget = matchingTargets.find((target) => String(target.case_assignments?.course_id) === courseId)
    if (clientAttemptId) {
      const { data: existingAttempt, error: existingError } = await supabaseAdmin
        .from("case_attempts")
        .select("id")
        .eq("user_id", input.userId)
        .eq("course_id", courseId)
        .eq("client_attempt_id", clientAttemptId)
        .maybeSingle()
      if (existingError) throw new Error(`Failed to inspect attempt: ${existingError.message}`)
      if (existingAttempt?.id) {
        attemptIds.push(String(existingAttempt.id))
        continue
      }
    }

    const { data: attempt, error } = await supabaseAdmin
      .from("case_attempts")
      .insert({
        user_id: input.userId,
        case_id: caseId,
        score,
        is_correct: input.isCorrect ?? null,
        duration_sec: durationSec,
        institution_id: course.institution_id,
        course_id: courseId,
        assignment_id: matchingTarget?.assignment_id || null,
        client_attempt_id: clientAttemptId,
        modality: input.modality?.trim().slice(0, 40) || null,
        metadata: input.metadata || {}
      })
      .select("id")
      .single()

    if (error) {
      if (error.code === "23505" && clientAttemptId) {
        const { data: existingAttempt } = await supabaseAdmin
          .from("case_attempts")
          .select("id")
          .eq("user_id", input.userId)
          .eq("course_id", courseId)
          .eq("client_attempt_id", clientAttemptId)
          .maybeSingle()
        if (existingAttempt?.id) {
          attemptIds.push(String(existingAttempt.id))
          continue
        }
      }
      throw new Error(`Failed to record institution attempt: ${error.message}`)
    }
    attemptIds.push(String(attempt.id))
  }

  for (const target of matchingTargets) {
    const assignment = target.case_assignments
    const requiredCaseIds: string[] = Array.isArray(assignment?.case_ids) ? assignment.case_ids.map(String) : []
    const { data: completedAttempts, error: completedAttemptsError } = await supabaseAdmin
      .from("case_attempts")
      .select("case_id")
      .eq("user_id", input.userId)
      .eq("course_id", assignment.course_id)
      .in("case_id", requiredCaseIds)
    if (completedAttemptsError) throw new Error(`Failed to calculate assignment progress: ${completedAttemptsError.message}`)
    const completedIds = new Set((completedAttempts || []).map((row) => String(row.case_id)))
    const complete = requiredCaseIds.length > 0 && requiredCaseIds.every((caseId) => completedIds.has(caseId))
    const { error: updateError } = await supabaseAdmin
      .from("case_assignment_students")
      .update({
        status: complete ? "COMPLETED" : "IN_PROGRESS",
        completed_at: complete ? new Date().toISOString() : null
      })
      .eq("assignment_id", target.assignment_id)
      .eq("student_user_id", input.userId)
    if (updateError) throw new Error(`Failed to update assignment progress: ${updateError.message}`)
  }

  return attemptIds
}

export async function recordInstitutionalPracticeOutcome(input: {
  userId: string
  action: string
  data?: unknown
  context?: unknown
  source: "web" | "mobile"
}) {
  if (input.action !== "case_submit" && input.action !== "ecg_simulation_complete") return null

  const data = input.data && typeof input.data === "object" ? input.data as Record<string, unknown> : {}
  const context = input.context && typeof input.context === "object" ? input.context as Record<string, unknown> : {}
  const caseId = String(data.caseId || (input.action === "ecg_simulation_complete" ? "ecg-simulation" : "")).trim()
  if (!caseId) throw new Error("A case identifier is required for completed practice")

  const rawAccuracy = typeof context.accuracy === "number" && Number.isFinite(context.accuracy)
    ? Number(context.accuracy)
    : null
  const rawDuration = typeof data.durationSec === "number" && Number.isFinite(data.durationSec)
    ? Number(data.durationSec)
    : null

  return recordInstitutionAttempt({
    userId: input.userId,
    caseId,
    courseId: data.courseId ? String(data.courseId) : null,
    attemptId: data.attemptId ? String(data.attemptId) : null,
    score: rawAccuracy === null ? null : rawAccuracy * 100,
    isCorrect: rawAccuracy === null ? null : rawAccuracy >= 0.7,
    durationSec: rawDuration,
    modality: data.modality ? String(data.modality) : data.caseType ? String(data.caseType).toUpperCase() : "ECG",
    metadata: {
      xpAction: input.action,
      source: input.source,
      scoreSource: rawAccuracy === null ? "unscored" : "client_reported"
    }
  })
}

export function roleCanManagePeople(role: InstitutionRole): role is StaffRole {
  return role === "INSTITUTION_ADMIN"
}
