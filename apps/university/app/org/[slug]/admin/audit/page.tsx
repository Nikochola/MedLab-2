import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

interface AuditPageProps {
  params: { slug: string }
}

async function requireOrgAdmin(slug: string) {
  const ctx = await getOrgContext()
  if (!ctx.userId) redirect("/login")
  const org = ctx.organizations.find((o) => o.slug === slug)
  if (!org) redirect("/org-admin")
  const membership = ctx.memberships.find((m) => m.orgId === org.id)
  if (!membership || membership.role !== "org_admin") redirect("/")
  return { org }
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { org } = await requireOrgAdmin(params.slug)
  const supabase = createSupabaseServerClient()
  const { data: logs } = await supabase
    .from("platform_audit")
    .select("created_at, actor_user_id, actor_role, action, target_type, target_id, metadata")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Org Admin</p>
            <h1 className="text-3xl font-bold">Audit log</h1>
            <p className="text-muted-foreground mt-2">Recent admin actions in {org.name} (latest 50).</p>
          </div>
          <a href={`/org/${org.slug}/admin`} className="text-sm text-blue-600 hover:underline">
            ← Back to admin
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <div className="col-span-2">Action</div>
            <div>Actor</div>
            <div>Target</div>
            <div>Metadata</div>
            <div className="text-right">When</div>
          </div>
          <div className="divide-y divide-border">
            {(logs ?? []).map((row, idx) => (
              <div key={idx} className="grid grid-cols-6 px-4 py-2 text-sm">
                <div className="col-span-2 font-medium">{row.action}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {row.actor_user_id} ({row.actor_role})
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.target_type}:{row.target_id}
                </div>
                <div className="text-xs text-muted-foreground truncate">{row.metadata ? JSON.stringify(row.metadata) : "—"}</div>
                <div className="text-right text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(!logs || !logs.length) && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No audit entries yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
