// lib/studentTracking.ts

import { supabase } from "./supabase"
import { StudentActivity, StudentProgress } from "./types"
import { XPActionType, calculateXPForAction, calculateLevel } from "./xp/xpConfig"

export async function incrementUsage(userId: string, feature: string) {
  const { error } = await supabase.rpc('increment_usage', { x_user_id: userId, x_feature: feature });
  if (error) console.error("Error incrementing usage:", error);
}

export async function logStudentActivity(input: {
  studentId: string
  classroomId?: string
  activityType: string
  data?: Record<string, any>
  xpAwarded?: number
  xpReason?: string
}): Promise<void> {
  const { error } = await supabase.from("student_activities").insert({
    student_id: input.studentId,
    classroom_id: input.classroomId ?? null,
    activity_type: input.activityType,
    data: input.data ?? {},
    xp_awarded: input.xpAwarded ?? 0,
    xp_reason: input.xpReason ?? null,
  })

  if (error) {
    console.error("logStudentActivity error:", error)
    throw error
  }
}

export async function awardXP(input: {
  studentId: string
  action: XPActionType
  data?: Record<string, any>
  context?: any // XPContext
}): Promise<{ xpAwarded: number; reason: string; newLevel?: number }> {
  // 1. Calculate XP
  const { amount, reason } = calculateXPForAction(input.action, input.context)

  if (amount === 0) {
    return { xpAwarded: 0, reason: "No XP awarded" }
  }

  // 2. Log activity with XP
  await logStudentActivity({
    studentId: input.studentId,
    activityType: input.action,
    data: input.data,
    xpAwarded: amount,
    xpReason: reason,
  })

  // 3. Update Student Stats (Atomic increment typically requires RPC or careful lock, 
  // but for MVP we fetch-modify-save or use simple upsert)

  // We need to fetch current stats to check for level up
  const { data: currentStats } = await supabase
    .from("student_progress")
    .select("total_xp, current_level")
    .eq("student_id", input.studentId)
    .single()

  const oldXP = currentStats?.total_xp || 0
  const oldLevel = currentStats?.current_level || 1
  const newXP = oldXP + amount
  const newLevel = calculateLevel(newXP)

  // Optimistic update of stats
  const { error } = await supabase.from("student_progress").upsert({
    student_id: input.studentId,
    total_xp: newXP,
    current_level: newLevel,
    last_activity: new Date().toISOString(),
    // We don't overwrite other fields, but upsert requires all NOT NULL fields if inserting new row.
    // Ideally we use a patch or ensure row exists. 
    // For now assuming row exists or triggers handle defaults.
  }, { onConflict: 'student_id', ignoreDuplicates: false })
  // Note: Standard upsert replaces row. We should probably use RPC for atomic increment in production.
  // Or simpler: Just update the specific fields if we know row exists. 

  if (error) {
    console.error("Failed to update XP stats", error)
  }

  return {
    xpAwarded: amount,
    reason,
    newLevel: newLevel > oldLevel ? newLevel : undefined
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
  // New gamification fields
  deltaXP?: number
  updateStreak?: boolean // Trigger streak recalc
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

  // Create base object with defaults for new fields
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
      totalXP: existing.total_xp ?? 0,
      currentLevel: existing.current_level ?? 1,
      currentStreak: existing.current_streak ?? 0,
      longestStreak: existing.longest_streak ?? 0,
      lastActivityDate: existing.last_activity_date,
      ecgStepsCorrect: existing.ecg_steps_correct ?? 0,
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
      totalXP: 0,
      currentLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      ecgStepsCorrect: 0,
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
    totalXP: base.totalXP + (input.deltaXP ?? 0),
  }

  // Increment usage for free gating if applicable
  if (input.deltaSimulations && input.deltaSimulations > 0) {
    await incrementUsage(input.studentId, "ecg_practice");
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
    total_xp: updated.totalXP,
    current_level: updated.currentLevel,
    // We map snake_case for DB
  })

  if (upsertError) {
    console.error("upsertStudentProgress upsert error:", upsertError)
    throw upsertError
  }
}
