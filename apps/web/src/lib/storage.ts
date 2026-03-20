// lib/storage.ts

import { supabase } from "./supabase"
import {
  StudentActivity,
  StudentProgress,
  CaseAssessment,
} from "./types"

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

