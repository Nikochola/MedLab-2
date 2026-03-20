import { NextResponse } from "next/server"

import { getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"
import { calculateStreak } from "@/lib/xp/streakUtils"

export async function GET() {
  const session = await getServerSession()
  const studentId = session?.user?.id

  if (!studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("student_progress")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (statsError && statsError.code !== "PGRST116") {
      throw statsError
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activities, error: activityError } = await supabaseAdmin
      .from("student_activities")
      .select("timestamp")
      .eq("student_id", studentId)
      .gte("timestamp", thirtyDaysAgo.toISOString())
      .order("timestamp", { ascending: false })

    if (activityError) {
      throw activityError
    }

    const activityDates = activities?.map((row: { timestamp: string }) => new Date(row.timestamp)) || []
    const calculatedStreak = calculateStreak(activityDates)

    return NextResponse.json(
      {
        totalXP: stats?.total_xp || 0,
        currentLevel: stats?.current_level || 1,
        currentStreak: calculatedStreak,
        longestStreak: Math.max(stats?.longest_streak || 0, calculatedStreak),
        ecgMastery: 0,
        casesCompleted: stats?.cases_completed || 0,
        simulationsCompleted: stats?.simulations_completed || 0,
        lastActivityDate: stats?.last_activity_date || null
      },
      {
        headers: {
          // Allow the browser to use a cached response for 30s, revalidate in background for up to 60s
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60"
        }
      }
    )
  } catch (error) {
    console.error("Error fetching student stats:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
