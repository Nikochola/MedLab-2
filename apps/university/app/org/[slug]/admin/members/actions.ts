"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { resolveTenant } from "@/lib/tenant"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer"
import type { OrgMember } from "@/lib/types"
import { generateInviteToken, sendInviteEmail } from "@/lib/emailInvites"

async function createInvites(
  orgSlug: string,
  orgId: string,
  entries: {
    email: string
    name?: string | null
    teacherId?: string | null
    role: OrgMember["role"]
  }[]
) {
  const supabase = createSupabaseServerClient()
  const tenant = await resolveTenant()
  if (tenant.membership?.role !== "org_admin" || tenant.organization?.id !== orgId) {
    throw new Error("Not authorized")
  }
  const admin = createSupabaseAdminClient()

  // Create invites and emails
  for (const entry of entries) {
    const token = generateInviteToken()
    const { error } = await admin.from("invites").insert({
      org_id: orgId,
      cohort_id: null,
      full_name: entry.name ?? null,
      email: entry.email,
      role: entry.role,
      teacher_id: entry.role === "student" ? entry.teacherId ?? null : null,
      token,
    })
    if (error) {
      console.error("createInvites insert failed", error)
      throw new Error("Invite insert failed")
    }
    await sendInviteEmail(entry.email, token, tenant.organization!.name, entry.role as any, orgSlug)
  }

  revalidatePath(`/org/${orgSlug}/admin/members`)
}

// Server action: single invite
export async function inviteMemberAction(formData: FormData) {
  const orgSlug = (formData.get("orgSlug") as string | null) ?? ""
  const orgId = (formData.get("orgId") as string | null) ?? ""
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const role = (formData.get("role") as OrgMember["role"]) ?? "student"
  const name = (formData.get("name") as string | null)?.trim() ?? null
  const teacherId = (formData.get("teacherId") as string | null) || null

  await createInvites(orgSlug, orgId, [{ email, name, teacherId, role }])
  redirect(`/org/${orgSlug}/admin/members?sent=single`)
}

// Server action: bulk invite with CSV
export async function bulkInviteAction(formData: FormData) {
  const orgSlug = (formData.get("orgSlug") as string | null) ?? ""
  const orgId = (formData.get("orgId") as string | null) ?? ""
  const raw = (formData.get("bulk_csv") as string | null) ?? ""

  const supabase = createSupabaseServerClient()
  const { data: teacherMembers } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "teacher")
  const teacherIds = (teacherMembers ?? []).map((m) => m.user_id as string)
  const { data: teacherUsers } = teacherIds.length
    ? await supabase.from("users").select("id, name, email").in("id", teacherIds)
    : { data: [] }
  const teacherMap = new Map<string, { id: string; name?: string | null; email?: string | null }>()
  for (const teacher of teacherUsers ?? []) {
    const nameKey = ((teacher.name as string | null) ?? "").trim().toLowerCase()
    const emailKey = ((teacher.email as string | null) ?? "").trim().toLowerCase()
    if (emailKey && !teacherMap.has(emailKey)) {
      teacherMap.set(emailKey, teacher as any)
    }
    if (nameKey && !teacherMap.has(nameKey)) {
      teacherMap.set(nameKey, teacher as any)
    }
  }

  const rows = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((f) => f.trim()))

  const entries = rows
    .filter((cols) => cols.length >= 3)
    .map((cols) => {
      const teacherIdentifier = cols[2] || ""
      const teacherMatch = teacherMap.get(teacherIdentifier.toLowerCase()) || null
      return {
        email: cols[0],
        name: cols[1],
        teacherId: teacherMatch?.id ?? null,
        role: "student" as OrgMember["role"],
      }
    })

  await createInvites(orgSlug, orgId, entries)
  redirect(`/org/${orgSlug}/admin/members?sent=bulk`)
}

export async function updateMemberRole(orgId: string, userId: string, role: OrgMember["role"]) {
  const supabase = createSupabaseServerClient()
  const tenant = await resolveTenant()
  if (tenant.membership?.role !== "org_admin" || tenant.organization?.id !== orgId) {
    throw new Error("Not authorized")
  }
  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
  redirect(`/org/${tenant.organization.slug}/admin/members`)
}

export async function removeMember(orgId: string, userId: string) {
  const supabase = createSupabaseServerClient()
  const tenant = await resolveTenant()
  if (tenant.membership?.role !== "org_admin" || tenant.organization?.id !== orgId) {
    throw new Error("Not authorized")
  }
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
  redirect(`/org/${tenant.organization.slug}/admin/members`)
}

async function generateClassroomCode(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const length = 6
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    const { data } = await admin.from("classrooms").select("id").eq("code", code).maybeSingle()
    if (!data) return code
  }
  return `CLS-${Date.now().toString(36).toUpperCase()}`
}

async function ensureTeacherClassroom(admin: ReturnType<typeof createSupabaseAdminClient>, teacherId: string) {
  const { data: existing } = await admin
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing) return existing

  const { data: teacher } = await admin.from("users").select("name, email").eq("id", teacherId).maybeSingle()
  const labelBase = (teacher?.name ?? teacher?.email ?? "Teacher").split(" ")[0] || "Teacher"
  const code = await generateClassroomCode(admin)
  const { data: created, error } = await admin
    .from("classrooms")
    .insert({ name: `${labelBase}'s Classroom`, teacher_id: teacherId, code, is_active: true })
    .select("id, name")
    .single()
  if (error) {
    console.error("ensureTeacherClassroom insert error:", error)
    throw error
  }
  return created
}

export async function assignStudentTeacher(orgId: string, studentId: string, teacherId: string | null) {
  const tenant = await resolveTenant()
  if (tenant.membership?.role !== "org_admin" || tenant.organization?.id !== orgId) {
    throw new Error("Not authorized")
  }

  const admin = createSupabaseAdminClient()
  const classroomId = teacherId ? (await ensureTeacherClassroom(admin, teacherId)).id : null

  await admin.from("users").update({ classroom_id: classroomId }).eq("id", studentId)
  await admin.from("student_progress").update({ classroom_id: classroomId }).eq("student_id", studentId)
  await admin.from("student_activities").update({ classroom_id: classroomId }).eq("student_id", studentId)
  await admin
    .from("case_assessments")
    .update({ classroom_id: classroomId, teacher_id: teacherId })
    .eq("student_id", studentId)

  redirect(`/org/${tenant.organization.slug}/admin/members`)
}
