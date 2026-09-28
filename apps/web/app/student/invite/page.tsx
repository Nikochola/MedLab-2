import { redirect } from "next/navigation"

// Legacy invite links (/student/invite?token=...) now use the secure magic-link flow.
export default function LegacyStudentInvitePage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token?.trim()
  redirect(token ? `/invite/${encodeURIComponent(token)}` : "/institution/login")
}
