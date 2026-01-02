import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { listOrganizations } from "@/lib/orgs"

async function requirePlatformAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "platform_admin") {
    redirect("/")
  }

  return { name: profile?.name ?? "Platform Admin" }
}

export default async function PlatformAdminPage() {
  const profile = await requirePlatformAdmin()
  const orgs = await listOrganizations()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Platform Admin</p>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-muted-foreground mt-2">Create/suspend organizations, manage entitlements, view usage.</p>
          <p className="text-sm text-muted-foreground mt-1">Signed in as {profile.name}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Organizations</h2>
            <p className="text-muted-foreground text-sm">Create and manage universities.</p>
            <div className="mt-3">
              <Link
                href="/platform-admin/create-university"
                className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm hover:bg-slate-50"
              >
                + Create university
              </Link>
            </div>
            <div className="mt-4 divide-y divide-border border border-border rounded-lg">
              {orgs.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No organizations yet.</div>
              )}
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/platform-admin/org/${org.id}`}
                  className="block p-3 text-sm space-y-1 rounded-lg border border-border hover:border-blue-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{org.name}</div>
                    <span className="text-xs rounded-full border px-2 py-0.5">
                      {org.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">Slug: {org.slug}</div>
                  <div className="text-muted-foreground text-xs">
                    Members: {org.memberCount ?? 0} · Features:{" "}
                    {org.entitlements
                      ? [
                          org.entitlements.ecgPractice && "ecg",
                          org.entitlements.cases && "cases",
                          org.entitlements.analytics && "analytics",
                        ]
                          .filter(Boolean)
                          .join(", ") || "none"
                      : "default"}
                  </div>
                  <div className="text-xs text-blue-600 underline">Manage</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Entitlements</h2>
            <p className="text-muted-foreground text-sm">TODO: Toggle features per org (ecg_practice, cases, analytics).</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Subscriptions</h2>
            <p className="text-muted-foreground text-sm">TODO: View org and individual subscriptions and seat usage.</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Usage</h2>
            <p className="text-muted-foreground text-sm">TODO: Add usage metrics and analytics.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
