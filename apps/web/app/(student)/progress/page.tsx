"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useStudentStats } from "@/lib/hooks/useStudentStats"
import { Flame, Zap, Trophy, Activity, ClipboardCheck, Stethoscope, Calendar, TrendingUp } from "lucide-react"

export default function ProgressPage() {
  const { user } = useAuth()
  const { stats, isLoading } = useStudentStats(user?.id)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Primary stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            label="Current Streak"
            value={stats?.currentStreak ?? 0}
            suffix="days"
            isLoading={isLoading}
          />
          <StatCard
            icon={<Zap className="h-5 w-5 text-amber-500" />}
            label="Total XP"
            value={stats?.totalXP ?? 0}
            isLoading={isLoading}
            formatNumber
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-blue-500" />}
            label="Level"
            value={stats?.currentLevel ?? 1}
            isLoading={isLoading}
          />
        </div>

        {/* Detail stats */}
        <div className="mt-6 rounded-2xl" style={{ border: "1px solid #E8E6DF" }}>
          <DetailRow
            icon={<TrendingUp className="h-[18px] w-[18px]" style={{ color: "#9B9A94" }} />}
            label="Longest Streak"
            value={isLoading ? "—" : `${stats?.longestStreak ?? 0} days`}
            first
          />
          <DetailRow
            icon={<Activity className="h-[18px] w-[18px]" style={{ color: "#9B9A94" }} />}
            label="ECG Mastery"
            value={isLoading ? "—" : `${stats?.ecgMastery ?? 0}%`}
          />
          <DetailRow
            icon={<ClipboardCheck className="h-[18px] w-[18px]" style={{ color: "#9B9A94" }} />}
            label="Cases Completed"
            value={isLoading ? "—" : `${stats?.casesCompleted ?? 0}`}
          />
          <DetailRow
            icon={<Stethoscope className="h-[18px] w-[18px]" style={{ color: "#9B9A94" }} />}
            label="Simulations"
            value={isLoading ? "—" : `${stats?.simulationsCompleted ?? 0}`}
          />
          <DetailRow
            icon={<Calendar className="h-[18px] w-[18px]" style={{ color: "#9B9A94" }} />}
            label="Last Active"
            value={isLoading ? "—" : stats?.lastActivityDate
              ? new Date(stats.lastActivityDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "No activity yet"
            }
            last
          />
        </div>

        {/* Tip */}
        <div
          className="mt-6 rounded-2xl px-5 py-4"
          style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0066FF" }}>
            Tip: Short, consistent sessions beat long study marathons.
          </p>
          <p className="text-xs mt-1" style={{ color: "#4D8AFF" }}>
            Focus on your weakest area first, then run one mixed practice set.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  isLoading,
  formatNumber,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  isLoading: boolean
  formatNumber?: boolean
}) {
  return (
    <div className="rounded-2xl px-5 py-5" style={{ backgroundColor: "#F5F5F3" }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-medium" style={{ color: "#6B6A65" }}>{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 rounded-lg animate-pulse" style={{ backgroundColor: "#E8E6DF" }} />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold" style={{ color: "#0E0F12" }}>
            {formatNumber ? value.toLocaleString() : value}
          </span>
          {suffix && <span className="text-sm font-medium" style={{ color: "#9B9A94" }}>{suffix}</span>}
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  first,
  last,
}: {
  icon: React.ReactNode
  label: string
  value: string
  first?: boolean
  last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{
        borderBottom: last ? "none" : "1px solid #E8E6DF",
        borderRadius: first ? "1rem 1rem 0 0" : last ? "0 0 1rem 1rem" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium" style={{ color: "#0E0F12" }}>{label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color: "#6B6A65" }}>{value}</span>
    </div>
  )
}
