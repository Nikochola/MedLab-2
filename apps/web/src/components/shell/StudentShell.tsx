"use client"

import type { CSSProperties, ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"
import { ShellBottomBar } from "@/components/shell/ShellBottomBar"
import { useAuth } from "@/contexts/AuthContext"

type StudentBranding = { name: string | null; logoUrl: string | null; primaryColor: string; accentColor: string; hideMedlabBranding: boolean } | null

export function StudentShell({ children, branding }: { children: ReactNode; branding?: StudentBranding }) {
  const { isWorkbenchMode } = useAuth()

  if (isWorkbenchMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh" }}>
        {children}
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh", "--institution-primary": branding?.primaryColor || "#0066FF", "--institution-accent": branding?.accentColor || "#EEF3FF" } as CSSProperties}>
      <div className="flex h-full">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block lg:flex-shrink-0 lg:h-full">
          <ShellSidebar branding={branding} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar branding={branding} />
          <main className="relative flex-1 bg-transparent overflow-y-auto overflow-x-hidden pb-[64px] lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <ShellBottomBar />
    </div>
  )
}
