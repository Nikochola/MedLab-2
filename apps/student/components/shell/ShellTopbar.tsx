"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronDown, Flame, UserCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

function getTitle(pathname: string) {
  if (pathname.startsWith("/ecg/practice")) return "ECG Practice"
  if (pathname.startsWith("/ecg/cases")) return "ECG Cases"
  if (pathname.startsWith("/ecg")) return "ECG Workbench"
  if (pathname.startsWith("/progress")) return "Progress"
  if (pathname.startsWith("/learn")) return "Learn"
  return "Workspace"
}

export function ShellTopbar() {
  const pathname = usePathname() || ""
  const title = useMemo(() => getTitle(pathname), [pathname])
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6">
        {/* LEFT */}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
          <div className="truncate text-xs text-slate-500">
            {user?.email ?? ""}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {/* Show stats at md+ (not only lg) */}
          <div className="hidden md:flex items-center gap-3">
            <StatsDisplay />
          </div>

          <div ref={menuRef} className="relative">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                menuOpen && "ring-2 ring-slate-200"
              )}
            >
              <UserCircle className="mr-2 h-5 w-5 text-slate-700" />

              {/* Always show a label (no hidden sm:inline) */}
              <span className="max-w-[160px] truncate font-semibold">
                {user?.name || user?.email || "Profile"}
              </span>

              <ChevronDown className="ml-2 h-4 w-4 text-slate-700" />
            </Button>

            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-900/5"
              >
                <div className="px-3 py-2 text-xs text-slate-500">
                  Signed in as
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {user?.email || "student"}
                  </div>
                </div>

                <div className="my-2 h-px bg-slate-100" />

                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600"
                  onClick={logout}
                >
                  Logout
                </Button>
              </motion.div>
            )}
          </div>
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
      <div className="flex gap-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[34px] w-20 rounded-xl bg-slate-100" />
        ))}
      </div>
    )
  }

  const items = [
    {
      label: "Streak",
      value: `${stats.currentStreak}d`,
      active: stats.currentStreak > 0,
    },
    {
      label: "XP",
      value: stats.totalXP.toLocaleString(),
      active: false,
    },
    {
      label: "Level",
      value: `L${stats.currentLevel}`,
      active: false,
    },
  ]

  return (
    <>
      {items.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "rounded-xl border px-3 py-2 text-xs transition-colors duration-300",
            stat.active ? "border-orange-200 bg-orange-50/50" : "border-slate-200/80 bg-white"
          )}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
            {stat.label}
            {stat.label === "Streak" && stats.currentStreak > 0 && (
              <Flame className="h-3 w-3 text-orange-500" />
            )}
          </div>
          <div className="text-sm font-semibold text-slate-900">{stat.value}</div>
        </div>
      ))}
    </>
  )
}