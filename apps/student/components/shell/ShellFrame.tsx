"use client"

import { ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { ShellSidebar } from "@/components/shell/ShellSidebar"
import { ShellTopbar } from "@/components/shell/ShellTopbar"

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full">
        <ShellSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopbar />
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f1f5f9_45%,_#e2e8f0_100%)]"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
