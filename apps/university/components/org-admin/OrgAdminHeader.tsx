import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type OrgAdminSection = "overview" | "members" | "cohorts" | "settings" | "audit"

interface OrgAdminHeaderProps {
  orgSlug: string
  title: string
  description?: string
  active?: OrgAdminSection
  actions?: ReactNode
}

export function OrgAdminHeader({ orgSlug, title, description, active = "overview", actions }: OrgAdminHeaderProps) {
  const navItems: Array<{ key: OrgAdminSection; label: string; href: string }> = [
    { key: "overview", label: "Overview", href: `/org/${orgSlug}/admin` },
    { key: "members", label: "Members", href: `/org/${orgSlug}/admin/members` },
    { key: "cohorts", label: "Cohorts", href: `/org/${orgSlug}/admin/cohorts` },
    { key: "settings", label: "Settings", href: `/org/${orgSlug}/admin/settings` },
    { key: "audit", label: "Audit log", href: `/org/${orgSlug}/admin/audit` },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -top-16 right-10 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Org Admin</p>
            <h1 className="text-3xl font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 text-sm">{actions}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm rounded-xl bg-slate-100/70 p-2 border border-border/70">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "inline-flex items-center rounded-lg px-3 py-1.5 border transition",
                active === item.key
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white/80 text-slate-700 border-transparent hover:bg-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
