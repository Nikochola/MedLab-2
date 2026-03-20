import { notFound, redirect } from "next/navigation"

import { getServerSession } from "@/server/auth/session"

function allowedTeamEmails() {
  const raw =
    process.env.MEDLAB_TEAM_EMAILS ||
    process.env.ADMIN_BOOTSTRAP_EMAIL ||
    ""

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireMedlabTeamAccess(nextPath = "/internal/institution-requests") {
  const session = await getServerSession()
  const isAdminRoute = nextPath.startsWith("/admin")

  if (!session?.user?.email) {
    if (isAdminRoute) {
      redirect("/admin/login")
    }
    redirect(`/student/login?next=${encodeURIComponent(nextPath)}`)
  }

  const normalizedEmail = session.user.email.trim().toLowerCase()
  const allowlist = allowedTeamEmails()

  if (!allowlist.length || !allowlist.includes(normalizedEmail)) {
    if (isAdminRoute) {
      redirect("/admin/login")
    }
    notFound()
  }

  return {
    session
  }
}
