"use client"

import type { ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"
import { ShellBottomBar } from "@/components/shell/ShellBottomBar"
import { useAuth } from "@/contexts/AuthContext"

export function StudentShell({ children }: { children: ReactNode }) {
  const { isWorkbenchMode } = useAuth()

  if (isWorkbenchMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh" }}>
        {children}
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh" }}>
      <div className="flex h-full">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block lg:flex-shrink-0 lg:h-full">
          <ShellSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar />
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
