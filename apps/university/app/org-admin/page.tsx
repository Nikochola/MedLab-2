import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/orgs"

export default async function OrgAdminRedirectPage() {
  const ctx = await getOrgContext()

  if (!ctx.userId) {
    redirect("/login")
  }

  const selected = ctx.selectedOrg

  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-3 text-center max-w-md">
          <h1 className="text-2xl font-semibold">No organizations</h1>
          <p className="text-muted-foreground">You are not a member of any organization. Ask an org admin to invite you.</p>
        </div>
      </div>
    )
  }

  const membership = ctx.memberships.find((m) => m.orgId === selected.id)

  if (!membership || membership.role !== "org_admin") {
    redirect("/")
  }

  redirect(`/org/${selected.slug}/admin`)
}
