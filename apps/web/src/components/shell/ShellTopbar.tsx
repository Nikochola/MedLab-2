"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Flame, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

function getTitle(pathname: string) {
  if (pathname.startsWith("/learn")) return "Learn"
  if (pathname.startsWith("/ecg") || pathname.startsWith("/xray")) return "Simulations"
  if (pathname.startsWith("/progress")) return "Progress"
  if (pathname.startsWith("/more")) return "Resources"
  if (pathname.startsWith("/shop")) return "Shop"
  if (pathname.startsWith("/profile")) return "Profile"
  if (pathname.startsWith("/practice")) return "Assignments"
  if (pathname.startsWith("/institution")) return "Dashboard"
  return "MedLab"
}

export function ShellTopbar() {
  const pathname = usePathname() || ""
  const title = useMemo(() => getTitle(pathname), [pathname])
  const { user, logout } = useAuth()

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: "white",
        borderBottom: "1px solid #E8E6DF",
        height: 72,
      }}
    >
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <h1 className="text-lg font-semibold" style={{ color: "#0E0F12" }}>
          {title}
        </h1>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <StatsDisplay />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors"
            style={{ color: "#6B6A65" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F5F5F3"
              e.currentTarget.style.color = "#0E0F12"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "#6B6A65"
            }}
          >
            <LogOut className="h-4 w-4" style={{ color: "#9B9A94" }} />
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}

function StatsDisplay() {
  const { user } = useAuth()
  const { stats, isLoading } = useStudentStats(user?.id)

  if (isLoading || !stats) {
    return (
      <div className="flex gap-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-20 rounded-lg" style={{ backgroundColor: "#F5F5F3" }} />
        ))}
      </div>
    )
  }

  const items = [
    {
      label: "Streak",
      value: `${stats.currentStreak}d`,
      hasFlame: stats.currentStreak > 0,
    },
    {
      label: "XP",
      value: stats.totalXP.toLocaleString(),
      hasFlame: false,
    },
    {
      label: "Level",
      value: `${stats.currentLevel}`,
      hasFlame: false,
    },
  ]

  return (
    <>
      {items.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            backgroundColor: "#F5F5F3",
          }}
        >
          {stat.hasFlame && (
            <Flame className="h-3.5 w-3.5 text-orange-500" />
          )}
          <span className="text-[13px] font-medium" style={{ color: "#6B6A65" }}>
            {stat.label}
          </span>
          <span className="text-[13px] font-semibold" style={{ color: "#0E0F12" }}>
            {stat.value}
          </span>
        </div>
      ))}
    </>
  )
}
