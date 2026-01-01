"use client"

import type { ReactNode } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { StudentShell } from "@/components/shell/StudentShell"

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <StudentShell>{children}</StudentShell>
    </ProtectedRoute>
  )
}
