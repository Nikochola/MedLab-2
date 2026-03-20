"use client"

import { ReactNode } from "react"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"

export function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900">
      <div className="flex h-full">
        <ShellSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar />
          <main className="flex-1 overflow-hidden bg-transparent">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
