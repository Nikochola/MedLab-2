import { NextResponse } from "next/server"

import { calculateXPForAction } from "@/lib/xp/xpConfig"
import { calculateStreak } from "@/lib/xp/streakUtils"
import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

const ALLOWED_ACTIONS = new Set([
  "ecg_step_correct",
  "ecg_step_complete",
  "ecg_simulation_complete",
  "case_submit",
  "daily_login",
])

const DAILY_ACTION_CAPS: Record<string, number> = {
  ecg_step_correct: 80,
  ecg_step_complete: 80,
  ecg_simulation_complete: 25,
  case_submit: 40,
  daily_login: 1,
}

function sanitizeContext(context: unknown): Record<string, unknown> {
  if (!context || typeof context !== "object") return {}
  const { accuracy: _a, isPerfect: _p, ...safe } = context as Record<string, unknown>
  return safe
}

export async function POST(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const body = await request.json().catch(() => null)
  const action = String(body?.action || "")
  const data = body?.data || {}

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const { amount, reason } = calculateXPForAction(action as any, sanitizeContext(body?.context))
  if (amount === 0) {
    return NextResponse.json({ xpAwarded: 0, reason: "No XP awarded" })
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", context.user.id)
    .maybeSingle()

  if (!profile) {
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      { id: context.user.id, email: context.user.email, full_name: context.user.name || context.user.email.split("@")[0] },
      { onConflict: "id" }
    )
    if (profileError) {
      return NextResponse.json({ error: "Failed to provision profile" }, { status: 500 })
    }
  }

  const caseId = action === "case_submit" && data?.caseId != null ? String(data.caseId) : null
  const { data: awardRows, error: awardError } = await supabaseAdmin.rpc("award_student_xp", {
    p_student_id: context.user.id,
    p_action: action,
    p_amount: amount,
    p_reason: reason,
    p_data: data,
    p_case_id: caseId,
    p_daily_cap: DAILY_ACTION_CAPS[action] ?? null,
    p_delta_case: action === "case_submit" ? 1 : 0,
    p_delta_sim: action === "ecg_simulation_complete" ? 1 : 0,
  })

  if (awardError) {
    console.error("[mobile/xp/award]", awardError)
    return NextResponse.json({ error: "Failed to award XP" }, { status: 500 })
  }

  const result = Array.isArray(awardRows) ? awardRows[0] : awardRows
  const awarded = result?.awarded ?? 0

  let currentStreak = 0
  if (awarded > 0) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: activities } = await supabaseAdmin
      .from("student_activities")
      .select("timestamp")
      .eq("student_id", context.user.id)
      .gte("timestamp", thirtyDaysAgo.toISOString())
      .order("timestamp", { ascending: false })

    currentStreak = calculateStreak((activities || []).map((row: { timestamp: string }) => new Date(row.timestamp)))

    const { data: progressRow } = await supabaseAdmin
      .from("student_progress")
      .select("longest_streak")
      .eq("student_id", context.user.id)
      .maybeSingle()

    await supabaseAdmin
      .from("student_progress")
      .update({
        current_streak: currentStreak,
        longest_streak: Math.max(progressRow?.longest_streak ?? 0, currentStreak),
        last_activity_date: new Date().toISOString().split("T")[0],
      })
      .eq("student_id", context.user.id)
  }

  return NextResponse.json({
    xpAwarded: awarded,
    reason: result?.reason ?? reason,
    newLevel: result?.leveled_up ? result?.current_level : undefined,
    currentStreak,
  })
}
