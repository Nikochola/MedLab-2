import { supabaseAdmin } from "@/server/supabaseAdmin"

import type { CourseAnalytics } from "@/server/institution/types"

export async function getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
  const { count: activeStudentsCount, error: studentCountError } = await supabaseAdmin
    .from("course_memberships")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("role", "STUDENT")
    .eq("status", "ACTIVE")

  if (studentCountError) {
    throw new Error(`Failed to count active students: ${studentCountError.message}`)
  }

  const { data: attempts, error: attemptsError } = await supabaseAdmin
    .from("case_attempts")
    .select("case_id,score,created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true })

  if (attemptsError) {
    throw new Error(`Failed to load case attempts for analytics: ${attemptsError.message}`)
  }

  const rows: Array<{ case_id: string; score: number | null; created_at: string }> = (attempts || []).map(
    (row: { case_id: string; score: number | null; created_at: string }) => row
  )

  if (!rows.length) {
    return {
      activeStudents: activeStudentsCount || 0,
      totalAttempts: 0,
      averageScore: null,
      trend: [],
      weakestCases: [],
      hasAttempts: false
    }
  }

  const scoreRows = rows.filter((row) => typeof row.score === "number")
  const averageScore =
    scoreRows.length > 0
      ? Number((scoreRows.reduce((sum, row) => sum + (row.score as number), 0) / scoreRows.length).toFixed(2))
      : null

  const trendMap = new Map<string, { attempts: number; scoreTotal: number; scoreCount: number }>()
  const caseMap = new Map<string, { attempts: number; scoreTotal: number; scoreCount: number }>()

  for (const row of rows) {
    const dateKey = new Date(row.created_at).toISOString().slice(0, 10)

    const trend = trendMap.get(dateKey) || { attempts: 0, scoreTotal: 0, scoreCount: 0 }
    trend.attempts += 1
    if (typeof row.score === "number") {
      trend.scoreTotal += row.score
      trend.scoreCount += 1
    }
    trendMap.set(dateKey, trend)

    const caseStats = caseMap.get(row.case_id) || { attempts: 0, scoreTotal: 0, scoreCount: 0 }
    caseStats.attempts += 1
    if (typeof row.score === "number") {
      caseStats.scoreTotal += row.score
      caseStats.scoreCount += 1
    }
    caseMap.set(row.case_id, caseStats)
  }

  const trend = Array.from(trendMap.entries())
    .map(([date, value]) => ({
      date,
      attempts: value.attempts,
      averageScore: value.scoreCount ? Number((value.scoreTotal / value.scoreCount).toFixed(2)) : null
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const weakestCases = Array.from(caseMap.entries())
    .map(([caseId, value]) => ({
      caseId,
      attempts: value.attempts,
      averageScore: value.scoreCount ? Number((value.scoreTotal / value.scoreCount).toFixed(2)) : null
    }))
    .sort((a, b) => {
      if (a.averageScore === null && b.averageScore === null) return 0
      if (a.averageScore === null) return 1
      if (b.averageScore === null) return -1
      return a.averageScore - b.averageScore
    })
    .slice(0, 5)

  return {
    activeStudents: activeStudentsCount || 0,
    totalAttempts: rows.length,
    averageScore,
    trend,
    weakestCases,
    hasAttempts: true
  }
}
