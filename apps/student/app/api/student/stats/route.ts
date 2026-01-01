import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { calculateStreak } from "@/lib/xp/streakUtils"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
    }

    try {
        // 1. Fetch persistent stats
        const { data: stats, error: statsError } = await supabase
            .from("student_progress")
            .select("*")
            .eq("student_id", studentId)
            .single()

        if (statsError && statsError.code !== "PGRST116") { // Ignore not found
            throw statsError
        }

        // 2. Fetch recent activity for accurate streak calculation
        // We fetch last 30 days to cover most streak scenarios
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: activities, error: activityError } = await supabase
            .from("student_activities")
            .select("timestamp")
            .eq("student_id", studentId)
            .gte("timestamp", thirtyDaysAgo.toISOString())
            .order("timestamp", { ascending: false })

        if (activityError) throw activityError

        // 3. Calculate dynamic streak
        // Note: We prefer this calculation over the stored 'current_streak' if we want real-time accuracy,
        // or we can use it to validate/repair the stored streak.
        const activityDates = activities?.map(a => new Date(a.timestamp)) || []
        const calculatedStreak = calculateStreak(activityDates)

        // Merge calculated streak with stored stats
        return NextResponse.json({
            totalXP: stats?.total_xp || 0,
            currentLevel: stats?.current_level || 1,
            currentStreak: calculatedStreak, // Use calculated for freshness
            longestStreak: Math.max(stats?.longest_streak || 0, calculatedStreak),
            ecgMastery: 0, // Placeholder, calculate from stepsCorrect / stepsAttempted if needed
            casesCompleted: stats?.cases_completed || 0,
            simulationsCompleted: stats?.simulations_completed || 0,
            lastActivityDate: stats?.last_activity_date || null
        })

    } catch (error) {
        console.error("Error fetching student stats:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
