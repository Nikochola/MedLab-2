"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { useGating } from "@/contexts/GatingContext"

interface ShellNavItemProps {
  href: string
  label: string
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>
  matchPaths?: string[]
  exactMatch?: boolean
  isCollapsed?: boolean
  isPro?: boolean
}

export function ShellNavItem({ href, label, icon: Icon, matchPaths, exactMatch, isCollapsed, isPro }: ShellNavItemProps) {
  const pathname = usePathname() || ""
  const matches = matchPaths ?? [href]
  const isActive = matches.some((path) => {
    if (exactMatch) return pathname === path
    return pathname === path || pathname.startsWith(`${path}/`)
  })

  const { plan } = useGating()
  const showLock = isPro && plan === "free"

  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[9px] px-4 py-3 text-[15px] font-medium transition-colors"
      style={{
        backgroundColor: isActive ? "#EEF3FF" : "transparent",
        border: isActive ? "1.5px solid #C7D9FF" : "1.5px solid transparent",
        color: isActive ? "#0066FF" : "#6B6A65",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "#F5F5F3"
          e.currentTarget.style.borderColor = "#E8E6DF"
          e.currentTarget.style.color = "#0E0F12"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent"
          e.currentTarget.style.borderColor = "transparent"
          e.currentTarget.style.color = "#6B6A65"
        }
      }}
      title={isCollapsed ? label : undefined}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <Icon
          className="h-5 w-5 shrink-0"
          style={{ color: isActive ? "#0066FF" : "#9B9A94" }}
        />
        {!isCollapsed && (
          <span className="truncate">{label}</span>
        )}
      </div>
      {showLock && !isCollapsed && (
        <Lock className="h-3.5 w-3.5" style={{ color: "#9B9A94" }} />
      )}
    </Link>
  )
}
