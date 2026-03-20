"use client"

import type { ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"
import { useAuth } from "@/contexts/AuthContext"

export function StudentShell({ children }: { children: ReactNode }) {
  const { isWorkbenchMode } = useAuth()

  if (isWorkbenchMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white text-slate-900">
        {children}
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900">
      <div className="flex h-full">
        <ShellSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar />
          <main className="relative flex-1 bg-transparent overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
