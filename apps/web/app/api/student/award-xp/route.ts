import { NextResponse } from "next/server"
import { getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"
import { calculateXPForAction } from "@/lib/xp/xpConfig"

// Server-authoritative anti-abuse: the client cannot be trusted to report which
// action happened (it can loop POSTs to mint unlimited XP). We bound every
// action type to a generous daily ceiling that no legitimate student reaches,
// and the dedup/cap/insert/increment all run atomically in the award_student_xp
// RPC (serialized per-student) so a concurrent burst can't slip past the cap.
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

// The client cannot prove these bonus conditions, so we never honor them from
// request input. `accuracy` (CASE_ACCURACY_BONUS) and `isPerfect`
// (SIMULATION_PERFECT_BONUS) are the high-value spoofable multipliers — strip
// them. Only base, deterministic XP is awarded server-side.
function sanitizeContext(context: unknown): Record<string, unknown> {
  if (!context || typeof context !== "object") return {}
  const { accuracy: _a, isPerfect: _p, ...safe } = context as Record<string, unknown>
  return safe
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const studentId = session.user.id
    const body = await request.json()
    const { action, data, context } = body

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 })
    }

    // Reject anything that isn't a known, XP-bearing action.
    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    // Calculate XP from server-trusted context only (no spoofable bonuses).
    const { amount, reason } = calculateXPForAction(action, sanitizeContext(context))

    if (amount === 0) {
      return NextResponse.json({ xpAwarded: 0, reason: "No XP awarded" })
    }

    // Ensure a profiles row exists for this student (FK dependency)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .maybeSingle()

    if (profileError) {
      console.error("[award-xp] profiles lookup error:", profileError)
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 })
    }

    if (!profile) {
      // Auto-provision a minimal profile so downstream FK constraints are satisfied
      const { data: sessionUser } = await supabaseAdmin.auth.admin.getUserById(studentId)
      const email = sessionUser?.user?.email ?? `${studentId}@unknown.invalid`
      const { error: insertProfileError } = await supabaseAdmin.from("profiles").upsert(
        { id: studentId, email, full_name: email.split("@")[0] },
        { onConflict: "id" }
      )
      if (insertProfileError) {
        console.error("[award-xp] profile upsert error:", insertProfileError)
        return NextResponse.json({ error: "Failed to provision profile" }, { status: 500 })
      }
    }

    const caseId = action === "case_submit" ? (data?.caseId != null ? String(data.caseId) : null) : null
    const deltaCase = action === "case_submit" ? 1 : 0
    const deltaSim = action === "ecg_simulation_complete" ? 1 : 0

    // Atomic, race-free award: dedup + daily cap + activity insert + XP/counter
    // increment, all under a per-student advisory lock inside the DB.
    const { data: awardRows, error: awardError } = await supabaseAdmin.rpc("award_student_xp", {
      p_student_id: studentId,
      p_action: action,
      p_amount: amount,
      p_reason: reason,
      p_data: data ?? {},
      p_case_id: caseId,
      p_daily_cap: DAILY_ACTION_CAPS[action] ?? null,
      p_delta_case: deltaCase,
      p_delta_sim: deltaSim,
    })

    if (awardError) {
      console.error("[award-xp] award_student_xp rpc error:", awardError)
      return NextResponse.json({ error: "Failed to award XP" }, { status: 500 })
    }

    const result = Array.isArray(awardRows) ? awardRows[0] : awardRows
    const awarded = result?.awarded ?? 0

    if (awarded === 0) {
      return NextResponse.json({ xpAwarded: 0, reason: result?.reason ?? "No XP awarded" })
    }

    // Recalculate streak from the (now-updated) activity ledger and persist it.
    // This is derived display state, not farmable — it reads the authoritative log.
    let currentStreak = 0
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from("student_activities")
      .select("timestamp")
      .eq("student_id", studentId)
      .gte("timestamp", thirtyDaysAgo.toISOString())
      .order("timestamp", { ascending: false })

    if (activitiesError) {
      console.error("[award-xp] activities query error:", activitiesError)
    } else {
      const activityDates = (activities ?? []).map((r: { timestamp: string }) => new Date(r.timestamp))
      const { calculateStreak } = await import("@/lib/xp/streakUtils")
      currentStreak = calculateStreak(activityDates)

      const { data: progressRow } = await supabaseAdmin
        .from("student_progress")
        .select("longest_streak")
        .eq("student_id", studentId)
        .maybeSingle()

      const { error: streakError } = await supabaseAdmin
        .from("student_progress")
        .update({
          current_streak: currentStreak,
          longest_streak: Math.max(progressRow?.longest_streak ?? 0, currentStreak),
          last_activity_date: new Date().toISOString().split("T")[0],
        })
        .eq("student_id", studentId)

      if (streakError) {
        console.error("[award-xp] streak update error:", streakError)
      }
    }

    return NextResponse.json({
      xpAwarded: awarded,
      reason: result?.reason ?? reason,
      newLevel: result?.leveled_up ? result?.current_level : undefined,
      currentStreak,
    })
  } catch (error) {
    console.error("[award-xp] Unexpected error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
