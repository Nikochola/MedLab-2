"use client"

import { useState, type ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"

export function ShellFrame({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh" }}>
      <div className="flex h-full">
        <ShellSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-hidden bg-transparent">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
