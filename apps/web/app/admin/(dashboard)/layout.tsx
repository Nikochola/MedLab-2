import type { ReactNode } from "react"

import { requireMedlabTeamAccess } from "@/server/internal/medlabTeam"
import { AdminShell } from "@/components/admin/AdminShell"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireMedlabTeamAccess("/admin")

  return <AdminShell>{children}</AdminShell>
}
