"use client"

import type { ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"
import { ShellBottomBar } from "@/components/shell/ShellBottomBar"

export function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900" style={{ height: "100dvh" }}>
      <div className="flex h-full">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block lg:flex-shrink-0 lg:h-full">
          <ShellSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar />
          {/* Extra bottom padding on mobile so content isn't hidden under the bottom bar */}
          <main className="flex-1 overflow-hidden bg-transparent pb-[64px] lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <ShellBottomBar />
    </div>
  )
}
