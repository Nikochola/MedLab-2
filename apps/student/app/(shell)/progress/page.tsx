"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

export default function ProgressPage() {
  const { user } = useAuth()
  const { stats, isLoading } = useStudentStats(user?.id)

  const defaultStats = [
    { title: "Weekly cadence", value: stats ? `${stats.currentStreak} day streak` : "--", note: "Keep it up!" },
    { title: "Cases solved", value: stats?.casesCompleted ?? "--", note: "Clinical reasoning" },
    { title: "Simulations", value: stats?.simulationsCompleted ?? "--", note: "Rhythm mastery" },
    { title: "Total XP", value: stats?.totalXP.toLocaleString() ?? "--", note: `Level ${stats?.currentLevel ?? 1}` },
  ]

  return (
    <div className="min-h-full px-6 py-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-slate-900">Progress Overview</h2>
        <p className="mt-2 text-sm text-slate-500">
          Track your ECG mastery, streaks, and recent milestones. This dashboard will light up as you complete sessions.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {defaultStats.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
              {isLoading ? (
                <div className="mt-2 h-7 w-24 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
