"use client"

import { useState, type ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"
import { useAuth } from "@/contexts/AuthContext"

export function StudentShell({ children }: { children: ReactNode }) {
  const { isWorkbenchMode } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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
        <ShellSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Mobile backdrop overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)} />
          <main className="relative flex-1 bg-transparent overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
