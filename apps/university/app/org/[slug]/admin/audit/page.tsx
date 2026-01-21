import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { OrgAdminHeader } from "@/components/org-admin/OrgAdminHeader"

interface AuditPageProps {
  params: { slug: string }
  searchParams?: { q?: string; action?: string; actor?: string; target?: string; order?: string }
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

export default async function AuditPage({ params, searchParams }: AuditPageProps) {
  const { org } = await requireOrgAdmin(params.slug)
  const supabase = createSupabaseServerClient()
  const order = searchParams?.order === "asc" ? "asc" : "desc"
  const { data: logs } = await supabase
    .from("platform_audit")
    .select("created_at, actor_user_id, actor_role, action, target_type, target_id, metadata")
    .eq("org_id", org.id)
    .order("created_at", { ascending: order === "asc" })
    .limit(50)

  const queryRaw = (searchParams?.q ?? "").trim()
  const query = queryRaw.toLowerCase()
  const actionFilter = (searchParams?.action ?? "all").toLowerCase()
  const actorFilter = (searchParams?.actor ?? "all").toLowerCase()
  const targetFilter = (searchParams?.target ?? "all").toLowerCase()

  const actionOptions = Array.from(new Set((logs ?? []).map((row) => row.action))).sort()
  const targetOptions = Array.from(new Set((logs ?? []).map((row) => row.target_type))).sort()

  const filteredLogs = (logs ?? []).filter((row) => {
    const matchesQuery =
      !query ||
      [row.action, row.actor_user_id, row.actor_role, row.target_type, row.target_id, JSON.stringify(row.metadata ?? {})]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    const matchesAction = actionFilter === "all" || row.action.toLowerCase() === actionFilter
    const matchesActor = actorFilter === "all" || row.actor_role.toLowerCase() === actorFilter
    const matchesTarget = targetFilter === "all" || row.target_type.toLowerCase() === targetFilter
    return matchesQuery && matchesAction && matchesActor && matchesTarget
  })

  const buildQuery = (overrides: Partial<Record<"q" | "action" | "actor" | "target" | "order", string>>) => {
    const params = new URLSearchParams()
    const values = {
      q: queryRaw,
      action: actionFilter,
      actor: actorFilter,
      target: targetFilter,
      order,
      ...overrides,
    }
    Object.entries(values).forEach(([key, value]) => {
      if (!value) return
      if (key === "action" && value === "all") return
      if (key === "actor" && value === "all") return
      if (key === "target" && value === "all") return
      if (key === "order" && value === "desc") return
      params.set(key, value)
    })
    const qs = params.toString()
    return qs ? `?${qs}` : ""
  }

  const filterChips = [
    queryRaw ? { label: `Search: ${queryRaw}`, href: buildQuery({ q: "" }) } : null,
    actionFilter !== "all" ? { label: `Action: ${actionFilter}`, href: buildQuery({ action: "all" }) } : null,
    actorFilter !== "all" ? { label: `Actor: ${actorFilter}`, href: buildQuery({ actor: "all" }) } : null,
    targetFilter !== "all" ? { label: `Target: ${targetFilter}`, href: buildQuery({ target: "all" }) } : null,
    order !== "desc" ? { label: "Order: oldest", href: buildQuery({ order: "desc" }) } : null,
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="admin-canvas">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <OrgAdminHeader
          orgSlug={org.slug}
          title="Audit log"
          description={`Recent admin actions in ${org.name} (latest 50).`}
          active="audit"
        />

        <div className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm space-y-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Search action, actor, target" />
            </div>
            <div className="min-w-[180px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</label>
              <select name="action" defaultValue={actionFilter}>
                <option value="all">All actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action.toLowerCase()}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actor role</label>
              <select name="actor" defaultValue={actorFilter}>
                <option value="all">All roles</option>
                <option value="org_admin">Org admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="platform_admin">Platform admin</option>
              </select>
            </div>
            <div className="min-w-[160px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</label>
              <select name="target" defaultValue={targetFilter}>
                <option value="all">All targets</option>
                {targetOptions.map((target) => (
                  <option key={target} value={target.toLowerCase()}>
                    {target}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</label>
              <select name="order" defaultValue={order}>
                <option value="desc">Newest</option>
                <option value="asc">Oldest</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Apply
            </button>
            <a
              href={`/org/${org.slug}/admin/audit`}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Reset
            </a>
          </form>

          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Active filters:</span>
              {filterChips.map((chip) => (
                <a
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-slate-600 hover:text-slate-900"
                >
                  {chip.label} x
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white/80 shadow-sm">
          <div className="grid grid-cols-6 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-2">Action</div>
            <div>Actor</div>
            <div>Target</div>
            <div>Metadata</div>
            <div className="text-right">When</div>
          </div>
          <div className="divide-y divide-border/70">
            {filteredLogs.map((row, idx) => (
              <div key={idx} className="grid grid-cols-6 px-4 py-3 text-sm transition-colors hover:bg-slate-50/80">
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
            {!filteredLogs.length && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No audit entries match the filters.</div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredLogs.length} of {(logs ?? []).length} audit entries.
        </div>
      </div>
    </div>
  )
}
