"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode } from "react"
import { Building2, LinkIcon, LogOut } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

const navItems = [
  { label: "Setup Links", href: "/admin/setup-links", icon: LinkIcon },
  { label: "Institutions", href: "/admin/institutions", icon: Building2 },
]

function AdminNavItem({
  href,
  label,
  icon: Icon,
  exactMatch,
}: {
  href: string
  label: string
  icon: typeof Building2
  exactMatch?: boolean
}) {
  const pathname = usePathname() || ""
  const isActive = exactMatch ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] font-medium transition-all"
      style={{
        backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
        color: isActive ? "white" : "rgba(255,255,255,0.5)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"
        if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.8)"
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent"
        if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.5)"
      }}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ opacity: isActive ? 1 : 0.6 }} />
      <span>{label}</span>
    </Link>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ""

  const titleMap: Record<string, string> = {
    "/admin/setup-links": "Setup Links",
    "/admin/institutions": "Institutions",
  }

  const title =
    Object.entries(titleMap).find(([path]) => pathname.startsWith(path))?.[1] || "Admin"

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: "#F8F7F2" }}
    >
      {/* Dark sidebar */}
      <aside
        className="flex h-full flex-shrink-0 flex-col"
        style={{ width: 220, backgroundColor: "#0E0F12" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5" style={{ height: 64 }}>
          <Link href="/admin">
            <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 18, filter: "brightness(0) invert(1)" }} />
          </Link>
          <span
            className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: "#0066FF", color: "white" }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <AdminNavItem key={item.label} {...item} />
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] font-medium transition-all"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,100,100,0.12)"
              e.currentTarget.style.color = "#F87171"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "rgba(255,255,255,0.4)"
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="flex shrink-0 items-center border-b px-8"
          style={{ height: 64, backgroundColor: "white", borderColor: "#E8E6DF" }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase"
              style={{ letterSpacing: "0.16em", color: "#9B9A94" }}
            >
              Platform Admin
            </p>
            <h1 className="text-base font-bold leading-tight" style={{ color: "#0E0F12" }}>
              {title}
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
