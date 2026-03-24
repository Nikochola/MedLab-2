"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Fire, Diamond, Star, SignOut } from "@phosphor-icons/react"
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
      className="sticky top-0 z-30 w-full"
      style={{
        backgroundColor: "white",
        borderBottom: "1px solid #E8E6DF",
      }}
    >
      {/* ── Mobile layout ── */}
      <div
        className="lg:hidden flex items-center justify-between gap-2 px-4"
        style={{ height: 56 }}
      >
        <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 17 }} />
        <MobileStats userId={user?.id} />
      </div>

      {/* ── Desktop layout ── */}
      <div
        className="hidden lg:flex items-center justify-between gap-3 px-6"
        style={{ height: 60 }}
      >
        <h1 className="text-lg font-semibold truncate" style={{ color: "#0E0F12" }}>
          {title}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <DesktopStats userId={user?.id} />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-2 text-[13px] font-medium transition-colors"
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
            <SignOut size={16} style={{ color: "#9B9A94" }} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

/** Duolingo-style stat chips for mobile */
function MobileStats({ userId }: { userId?: string }) {
  const { stats, isLoading } = useStudentStats(userId)

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-14 rounded-xl" style={{ backgroundColor: "#F5F5F3" }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Streak */}
      <div
        className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
        style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA" }}
      >
        <Fire size={15} weight="fill" style={{ color: "#EA580C" }} />
        <span className="text-[13px] font-bold" style={{ color: "#EA580C" }}>
          {stats.currentStreak}
        </span>
      </div>

      {/* XP */}
      <div
        className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
        style={{ backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" }}
      >
        <Diamond size={15} weight="fill" style={{ color: "#0066FF" }} />
        <span className="text-[13px] font-bold" style={{ color: "#0066FF" }}>
          {stats.totalXP >= 1000 ? `${(stats.totalXP / 1000).toFixed(1)}k` : stats.totalXP}
        </span>
      </div>

      {/* Level */}
      <div
        className="flex items-center gap-1 rounded-xl px-2.5 py-1.5"
        style={{ backgroundColor: "#FEFCE8", border: "1.5px solid #FEF08A" }}
      >
        <Star size={15} weight="fill" style={{ color: "#CA8A04" }} />
        <span className="text-[13px] font-bold" style={{ color: "#CA8A04" }}>
          {stats.currentLevel}
        </span>
      </div>
    </div>
  )
}

/** Full stat pills for desktop */
function DesktopStats({ userId }: { userId?: string }) {
  const { stats, isLoading } = useStudentStats(userId)

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
    { label: "Streak", value: `${stats.currentStreak}d`, icon: <Fire size={14} weight="fill" style={{ color: "#EA580C" }} /> },
    { label: "XP",     value: stats.totalXP.toLocaleString(), icon: <Diamond size={14} weight="fill" style={{ color: "#0066FF" }} /> },
    { label: "Level",  value: `${stats.currentLevel}`,        icon: <Star size={14} weight="fill" style={{ color: "#CA8A04" }} /> },
  ]

  return (
    <>
      {items.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: "#F5F5F3" }}
        >
          {stat.icon}
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
