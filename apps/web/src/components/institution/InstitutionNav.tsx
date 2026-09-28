"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CircleHelp,
  ClipboardList,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  PlugZap,
  ShieldCheck,
  Settings,
  UsersRound
} from "lucide-react"

import { SignOutButton } from "@/components/auth/SignOutButton"

const baseItems = [
  { href: "/institution/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/institution/courses", label: "Classes", icon: GraduationCap },
  { href: "/institution/students", label: "Students", icon: UsersRound },
  { href: "/institution/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/institution/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/institution/reports", label: "Reports", icon: FileDown }
]

export function InstitutionNav(input: {
  institutionName: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR"
  userName: string
  userEmail: string
  brandName?: string | null
  brandLogoUrl?: string | null
  hideMedlabBranding?: boolean
}) {
  const pathname = usePathname()
  const items = [
    ...baseItems.slice(0, 2),
    ...(input.role === "INSTITUTION_ADMIN"
      ? [{ href: "/institution/educators", label: "Educators", icon: BookOpenCheck }]
      : []),
    ...baseItems.slice(2),
    ...(input.role === "INSTITUTION_ADMIN"
      ? [
        { href: "/institution/integrations", label: "Integrations", icon: PlugZap },
        { href: "/institution/enterprise", label: "Enterprise", icon: ShieldCheck },
        { href: "/institution/settings", label: "Settings", icon: Settings }
      ]
      : []),
    { href: "/institution/support", label: "Support", icon: CircleHelp }
  ]

  return (
    <aside className="institution-rail">
      <Link href="/institution/overview" className="flex shrink-0 items-center px-3 lg:hidden" aria-label={`${input.brandName || "MedLab"} institution overview`}>
        {input.brandLogoUrl ? <img src={input.brandLogoUrl} alt="" className="h-7 max-w-[90px] object-contain" /> : <Image src="/icon.svg" alt="" width={28} height={28} priority />}
      </Link>
      <div className="institution-brand-block">
        <Link href="/institution/overview" className="inline-flex min-h-[22px] items-center gap-2" aria-label={`${input.brandName || "MedLab"} institution overview`}>
          {input.brandLogoUrl ? <img src={input.brandLogoUrl} alt={input.brandName || input.institutionName} className="h-7 max-w-[170px] object-contain object-left" /> : input.brandName ? <span className="text-lg font-semibold tracking-[-.03em] text-[#0e0f12]">{input.brandName}</span> : <Image src="/images/logo_black.svg" alt="MedLab" width={110} height={22} priority className="h-[19px] w-auto" />}
          {input.hideMedlabBranding || (!input.brandLogoUrl && !input.brandName) ? null : <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#8a8881]">with MedLab</span>}
        </Link>
        <div className="mt-7 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E0F12] text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0E0F12]">{input.institutionName}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8881]">
              {input.role === "INSTITUTION_ADMIN" ? "Administrator" : "Educator"}
            </p>
          </div>
        </div>
      </div>

      <nav className="institution-nav" aria-label="Institution portal">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className="institution-nav-link" data-active={active || undefined}>
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex shrink-0 items-center pr-2 lg:hidden [&_button]:h-9 [&_button]:px-2.5 [&_button]:text-[11px]">
        <SignOutButton />
      </div>

      <div className="institution-user-card">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE8FF] text-xs font-bold text-[#0047CC]">
            {input.userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#0E0F12]">{input.userName}</p>
            <p className="truncate text-[11px] text-[#8A8881]">{input.userEmail}</p>
          </div>
        </div>
        <div className="mt-3 [&_button]:w-full [&_button]:justify-center [&_button]:rounded-lg [&_button]:border-[#D8D5CC] [&_button]:bg-white [&_button]:text-[#4B4A46]">
          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}
