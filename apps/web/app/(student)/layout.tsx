import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { StudentShell } from "@/components/shell/StudentShell"
import { getSessionWithRole } from "@/server/auth/session"

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/student/login?next=/learn")
  }

  return <StudentShell>{children}</StudentShell>
}
