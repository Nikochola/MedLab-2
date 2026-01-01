// lib/storage.ts

import { supabase } from "./supabase"
import {
  User,
  Classroom,
  StudentActivity,
  StudentProgress,
  CaseAssessment,
} from "./types"

/* ============================================================
   Mapping Helpers
   ============================================================ */

function mapUserRow(row: Record<string, any>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as User["role"],
    classroomId: (row.classroom_id as string | undefined) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapClassroomRow(row: Record<string, any>): Classroom {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    teacherId: row.teacher_id as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    studentIds: [],
  }
}

/* ============================================================
   USERS
   ============================================================ */

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("getUserById error:", error)
    return null
  }
  return data ? mapUserRow(data) : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle()

  if (error) {
    console.error("getUserByEmail error:", error)
    return null
  }
  return data ? mapUserRow(data) : null
}

export async function saveUser(user: User): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role,
      classroom_id: user.classroomId ?? null,
      created_at: user.createdAt ?? new Date().toISOString(),
    },
    { onConflict: "id" }
  )

  if (error) {
    console.error("saveUser error:", error)
    throw error
  }
}

/* ============================================================
   CLASSROOMS
   ============================================================ */

export async function getClassroomByCode(code: string): Promise<Classroom | null> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle()

  if (error) {
    console.error("getClassroomByCode error:", error)
    return null
  }
  return data ? mapClassroomRow(data) : null
}

export async function getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
  const { data, error } = await supabase
    .from("classrooms")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("getTeacherClassrooms error:", error)
    return []
  }
  return (data ?? []).map(mapClassroomRow)
}

export async function saveClassroom(input: {
  name: string
  teacherId: string
  code?: string
}): Promise<Classroom> {
  const code = (input.code ?? (await generateClassroomCode())).toUpperCase()

  const { data, error } = await supabase
    .from("classrooms")
    .insert({
      name: input.name,
      teacher_id: input.teacherId,
      code,
      is_active: true,
    })
    .select("*")
    .single()

  if (error) {
    console.error("saveClassroom error:", error)
    throw error
  }

  return mapClassroomRow(data)
}

export async function archiveClassroom(classroomId: string): Promise<void> {
  const { error } = await supabase
    .from("classrooms")
    .update({ is_active: false })
    .eq("id", classroomId)

  if (error) {
    console.error("archiveClassroom error:", error)
    throw error
  }
}

export async function generateClassroomCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const length = 6

  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }

    const { data, error } = await supabase
      .from("classrooms")
      .select("id")
      .eq("code", code)
      .maybeSingle()

    if (error) {
      console.error("generateClassroomCode check error:", error)
      return code
    }

    if (!data) return code
  }

  return `CLS-${Date.now().toString(36).toUpperCase()}`
}

/* ============================================================
   STUDENT PROGRESS
   ============================================================ */

export async function getClassroomProgress(
  classroomId: string
): Promise<StudentProgress[]> {
  const { data, error } = await supabase
    .from("student_progress")
    .select("*")
    .eq("classroom_id", classroomId)

  if (error) {
    console.error("getClassroomProgress error:", error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    classroomId: row.classroom_id,
    simulationsCompleted: row.simulations_completed,
    casesCompleted: row.cases_completed,
    totalTimeSpent: row.total_time_spent,
    stepsAttempted: row.steps_attempted ?? {},
    lastActivity: row.last_activity,
    totalXP: row.total_xp ?? 0,
    currentLevel: row.current_level ?? 1,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastActivityDate: row.last_activity_date ?? null,
    ecgStepsCorrect: row.ecg_steps_correct ?? 0,
  }))
}

/* ============================================================
   ASSESSMENTS
   ============================================================ */

export async function getClassroomAssessments(
  classroomId: string
): Promise<CaseAssessment[]> {
  const { data, error } = await supabase
    .from("case_assessments")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("submitted_at", { ascending: false })

  if (error) {
    console.error("getClassroomAssessments error:", error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    classroomId: row.classroom_id,
    teacherId: row.teacher_id,
    submittedAt: row.submitted_at,
    patientCase: row.patient_case,
    ecgFindings: row.ecg_findings,
    assessment: row.assessment,
  }))
}

export async function saveCaseAssessment(input: {
  studentId: string
  studentName: string
  classroomId: string
  teacherId?: string
  patientCase: any
  ecgFindings: any
  assessment: any
}): Promise<void> {
  const { error } = await supabase.from("case_assessments").insert({
    student_id: input.studentId,
    student_name: input.studentName,
    classroom_id: input.classroomId,
    teacher_id: input.teacherId ?? null,
    patient_case: input.patientCase,
    ecg_findings: input.ecgFindings,
    assessment: input.assessment,
  })

  if (error) {
    console.error("saveCaseAssessment error:", error)
    throw error
  }
}

/* ============================================================
   STUDENT ACTIVITY LOGGING
   ============================================================ */

export async function getStudentActivities(
  classroomId: string
): Promise<StudentActivity[]> {
  const { data, error } = await supabase
    .from("student_activities")
    .select("*")
    .eq("classroom_id", classroomId)
    .order("timestamp", { ascending: false })

  if (error) {
    console.error("getStudentActivities error:", error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    classroomId: row.classroom_id,
    activityType: row.activity_type,
    data: row.data,
    timestamp: row.timestamp,
  }))
}

export async function getCaseAssessmentsByTeacher(
  teacherId: string
): Promise<CaseAssessment[]> {
  const { data, error } = await supabase
    .from("case_assessments")
    .select(
      `
      *,
      classrooms!inner(teacher_id)
    `
    )
    .eq("classrooms.teacher_id", teacherId)
    .order("submitted_at", { ascending: false })

  if (error) {
    console.error("getCaseAssessmentsByTeacher error:", error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    classroomId: row.classroom_id,
    teacherId: row.teacher_id,
    submittedAt: row.submitted_at,
    patientCase: row.patient_case,
    ecgFindings: row.ecg_findings,
    assessment: row.assessment,
  }))
}
