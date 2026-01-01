// lib/studentTracking.ts

import { supabase } from "./supabase"
import { StudentActivity, StudentProgress } from "./types"

export async function logStudentActivity(input: {
  studentId: string
  classroomId?: string
  activityType: string
  data?: Record<string, any>
}): Promise<void> {
  const { error } = await supabase.from("student_activities").insert({
    student_id: input.studentId,
    classroom_id: input.classroomId ?? null,
    activity_type: input.activityType,
    data: input.data ?? {},
  })

  if (error) {
    console.error("logStudentActivity error:", error)
    throw error
  }
}

export async function upsertStudentProgress(input: {
  studentId: string
  studentName: string
  classroomId?: string
  deltaSimulations?: number
  deltaCases?: number
  deltaTime?: number
  stepsAttemptedPatch?: Record<string, any>
}): Promise<void> {
  // Load existing
  const { data: existing, error: selectError } = await supabase
    .from("student_progress")
    .select("*")
    .eq("student_id", input.studentId)
    .maybeSingle()

  if (selectError) {
    console.error("upsertStudentProgress select error:", selectError)
  }

  const base: StudentProgress = existing
    ? {
        studentId: existing.student_id,
        studentName: existing.student_name,
        classroomId: existing.classroom_id,
        simulationsCompleted: existing.simulations_completed,
        casesCompleted: existing.cases_completed,
        totalTimeSpent: existing.total_time_spent,
        stepsAttempted: existing.steps_attempted ?? {},
        lastActivity: existing.last_activity,
      }
    : {
        studentId: input.studentId,
        studentName: input.studentName,
        classroomId: input.classroomId ?? null,
        simulationsCompleted: 0,
        casesCompleted: 0,
        totalTimeSpent: 0,
        stepsAttempted: {},
        lastActivity: new Date().toISOString(),
      }

  const updated: StudentProgress = {
    ...base,
    studentName: input.studentName ?? base.studentName,
    classroomId: input.classroomId ?? base.classroomId,
    simulationsCompleted:
      base.simulationsCompleted + (input.deltaSimulations ?? 0),
    casesCompleted: base.casesCompleted + (input.deltaCases ?? 0),
    totalTimeSpent: base.totalTimeSpent + (input.deltaTime ?? 0),
    stepsAttempted: {
      ...base.stepsAttempted,
      ...(input.stepsAttemptedPatch ?? {}),
    },
    lastActivity: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase.from("student_progress").upsert({
    student_id: updated.studentId,
    student_name: updated.studentName,
    classroom_id: updated.classroomId,
    simulations_completed: updated.simulationsCompleted,
    cases_completed: updated.casesCompleted,
    total_time_spent: updated.totalTimeSpent,
    steps_attempted: updated.stepsAttempted,
    last_activity: updated.lastActivity,
  })

  if (upsertError) {
    console.error("upsertStudentProgress upsert error:", upsertError)
    throw upsertError
  }
}
