import { supabaseAdmin } from "@/server/supabaseAdmin"

import type { CourseRecord, InstitutionRole } from "@/server/institution/types"

export async function ensureDefaultCourse(institutionId: string) {
  const { data: existingCourses, error: existingError } = await supabaseAdmin
    .from("courses")
    .select("id,institution_id,name,code,term,start_date,end_date,is_archived,created_at")
    .eq("institution_id", institutionId)
    .limit(1)

  if (existingError) {
    throw new Error(`Failed to inspect existing courses: ${existingError.message}`)
  }

  if (existingCourses?.length) {
    return existingCourses[0] as CourseRecord
  }

  const { data: createdCourse, error: insertError } = await supabaseAdmin
    .from("courses")
    .insert({
      institution_id: institutionId,
      name: "General",
      code: "DEFAULT"
    })
    .select("id,institution_id,name,code,term,start_date,end_date,is_archived,created_at")
    .single()

  if (insertError || !createdCourse) {
    throw new Error(`Failed to create default course: ${insertError?.message || "Unknown error"}`)
  }

  const { data: members, error: membersError } = await supabaseAdmin
    .from("institution_memberships")
    .select("user_id,role,status")
    .eq("institution_id", institutionId)
    .eq("status", "ACTIVE")

  if (membersError) {
    throw new Error(`Failed to list institution members for default enrollment: ${membersError.message}`)
  }

  const enrollments = (members || [])
    .filter((member: { role: string }) => member.role === "EDUCATOR" || member.role === "STUDENT")
    .map((member: { user_id: string; role: "EDUCATOR" | "STUDENT" }) => ({
      course_id: createdCourse.id,
      user_id: member.user_id,
      role: member.role,
      status: "ACTIVE"
    }))

  if (enrollments.length) {
    const { error: enrollmentError } = await supabaseAdmin
      .from("course_memberships")
      .upsert(enrollments, { onConflict: "course_id,user_id" })

    if (enrollmentError) {
      throw new Error(`Failed to enroll members into default course: ${enrollmentError.message}`)
    }
  }

  return createdCourse as CourseRecord
}

export async function listCourses(institutionId: string) {
  await ensureDefaultCourse(institutionId)

  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,institution_id,name,code,term,start_date,end_date,is_archived,created_at")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to list courses: ${error.message}`)
  }

  return (data || []) as CourseRecord[]
}

export async function createCourse(input: {
  institutionId: string
  name: string
  code?: string | null
  term?: string | null
  startDate?: string | null
  endDate?: string | null
}) {
  const payload = {
    institution_id: input.institutionId,
    name: input.name.trim(),
    code: input.code?.trim() ? input.code.trim().toUpperCase() : null,
    term: input.term?.trim() || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null
  }

  if (!payload.name) {
    throw new Error("Course name is required")
  }

  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert(payload)
    .select("id,institution_id,name,code,term,start_date,end_date,is_archived,created_at")
    .single()

  if (error || !data) {
    throw new Error(`Failed to create course: ${error?.message || "Unknown error"}`)
  }

  return data as CourseRecord
}

export async function getCourseById(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,institution_id,name,code,term,start_date,end_date,is_archived,created_at")
    .eq("id", courseId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load course: ${error.message}`)
  }

  return (data as CourseRecord | null) || null
}

export async function userCanAccessCourse(input: {
  courseId: string
  userId: string
  institutionRole: InstitutionRole
}) {
  if (input.institutionRole === "INSTITUTION_ADMIN") {
    return true
  }

  const { data, error } = await supabaseAdmin
    .from("course_memberships")
    .select("id")
    .eq("course_id", input.courseId)
    .eq("user_id", input.userId)
    .eq("status", "ACTIVE")
    .eq("role", "EDUCATOR")
    .limit(1)

  if (error) {
    throw new Error(`Failed to check course access: ${error.message}`)
  }

  return Boolean(data?.length)
}
