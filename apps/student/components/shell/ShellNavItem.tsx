"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { useGating } from "@/contexts/GatingContext"
import { cn } from "@/lib/utils"

interface ShellNavItemProps {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  matchPaths?: string[]
  isCollapsed?: boolean
  isPro?: boolean
}

export function ShellNavItem({ href, label, icon: Icon, matchPaths, isCollapsed, isPro }: ShellNavItemProps) {
  const pathname = usePathname() || ""
  const matches = matchPaths ?? [href]
  const isActive = matches.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const { plan } = useGating()

  const showLock = isPro && plan === "free"

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-slate-100 text-slate-900 shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
      title={isCollapsed ? label : undefined}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
        <span
          className={cn(
            "truncate transition-all duration-200",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          {label}
        </span>
      </div>
      {showLock && !isCollapsed && (
        <Lock className="h-3.5 w-3.5 text-slate-400" />
      )}
    </Link>
  )
}
