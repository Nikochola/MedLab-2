import { NextResponse } from "next/server"

import { calculateStreak } from "@/lib/xp/streakUtils"
import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function GET(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const { data: stats, error: statsError } = await supabaseAdmin
    .from("student_progress")
    .select("*")
    .eq("student_id", context.user.id)
    .maybeSingle()

  if (statsError && statsError.code !== "PGRST116") {
    return NextResponse.json({ error: statsError.message }, { status: 500 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: activities, error: activityError } = await supabaseAdmin
    .from("student_activities")
    .select("timestamp")
    .eq("student_id", context.user.id)
    .gte("timestamp", thirtyDaysAgo.toISOString())
    .order("timestamp", { ascending: false })

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 500 })
  }

  const currentStreak = calculateStreak((activities || []).map((row: { timestamp: string }) => new Date(row.timestamp)))

  return NextResponse.json({
    totalXP: stats?.total_xp || 0,
    currentLevel: stats?.current_level || 1,
    currentStreak,
    longestStreak: Math.max(stats?.longest_streak || 0, currentStreak),
    ecgMastery: 0,
    casesCompleted: stats?.cases_completed || 0,
    simulationsCompleted: stats?.simulations_completed || 0,
    lastActivityDate: stats?.last_activity_date || null,
  })
}
