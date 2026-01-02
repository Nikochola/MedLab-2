import Link from "next/link"
import { redirect } from "next/navigation"
import { getOrgContext, getEntitlementsForOrg, getCohortsForOrg } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { logoutAction } from "@/app/actions/auth"

interface OrgAdminPageProps {
  params: { slug: string }
}

function Info({ hint }: { hint: string }) {
  return (
    <span className="relative inline-flex align-middle group">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">i</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
        {hint}
      </span>
    </span>
  )
}

async function getRoleCounts(orgId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("org_members").select("role").eq("org_id", orgId)
  if (error) return { teacher: 0, student: 0, org_admin: 0 }
  const counts: Record<string, number> = { org_admin: 0, teacher: 0, student: 0 }
  data?.forEach((row: any) => {
    if (counts[row.role]) counts[row.role] += 1
    else if (row.role === "org_admin") counts.org_admin += 1
    else if (row.role === "teacher") counts.teacher += 1
    else if (row.role === "student") counts.student += 1
  })
  return counts
}

async function getProgressSummary(orgId: string) {
  const supabase = createSupabaseServerClient()
  const { data: members } = await supabase.from("org_members").select("user_id, role").eq("org_id", orgId)
  const studentIds = (members ?? []).filter((m) => m.role === "student").map((m) => m.user_id as string)
  if (!studentIds.length) return { students: 0, active: 0, sims: 0, cases: 0, time: 0 }
  const { data: progressRows } = await supabase
    .from("student_progress")
    .select("student_id, simulations_completed, cases_completed, total_time_spent, last_activity")
    .in("student_id", studentIds)
  let active = 0,
    sims = 0,
    cases = 0,
    time = 0
  for (const row of progressRows ?? []) {
    if (row.last_activity) active += 1
    sims += (row.simulations_completed as number | null) ?? 0
    cases += (row.cases_completed as number | null) ?? 0
    time += (row.total_time_spent as number | null) ?? 0
  }
  return { students: studentIds.length, active, sims, cases, time }
}

export default async function OrgAdminPage({ params }: OrgAdminPageProps) {
  const ctx = await getOrgContext()
  if (!ctx.userId) redirect("/login")
  const org = ctx.organizations.find((o) => o.slug === params.slug)
  if (!org) redirect("/org-admin")
  const membership = ctx.memberships.find((m) => m.orgId === org.id)
  if (!membership || membership.role !== "org_admin") redirect("/")

  // still fetch entitlements/cohorts if needed elsewhere
  await Promise.all([getCohortsForOrg(org.id), getEntitlementsForOrg(org.id)])
  const counts = await getRoleCounts(org.id)
  const progress = await getProgressSummary(org.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Org Admin</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{org.name} admin</h1>
              <p className="text-muted-foreground mt-2">Manage members, seats, analytics, and settings.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <a
                href="/account"
                className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 shadow-sm hover:bg-slate-50"
              >
                Account
              </a>
              <a
                href={`/org/${org.slug}/admin/settings`}
                className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 shadow-sm hover:bg-slate-50"
              >
                Settings
              </a>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 shadow-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Seat usage</span>
              <Info hint="Teachers + students currently in this org vs seat limit." />
            </div>
            <div className="text-3xl font-bold">
              {counts.teacher + counts.student}
              <span className="text-base font-medium text-muted-foreground">{org.seatLimit ? ` / ${org.seatLimit}` : " seats"}</span>
            </div>
            <p className="text-xs text-muted-foreground">Teachers: {counts.teacher} · Students: {counts.student}</p>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Members</span>
              <Info hint="Open roster to invite and manage roles." />
            </div>
            <p className="text-sm text-muted-foreground">Invite and manage members from the roster.</p>
            <Link
              href={`/org/${org.slug}/admin/members`}
              className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              Open roster & invites
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold mb-3">Analytics</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
              <div className="text-xs text-muted-foreground">Active students</div>
              <div className="text-xl font-semibold">
                {progress.active}/{progress.students || 0}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
              <div className="text-xs text-muted-foreground">Simulations completed</div>
              <div className="text-xl font-semibold">{progress.sims}</div>
            </div>
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
              <div className="text-xs text-muted-foreground">Cases completed</div>
              <div className="text-xl font-semibold">{progress.cases}</div>
            </div>
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
              <div className="text-xs text-muted-foreground">Total time (min)</div>
              <div className="text-xl font-semibold">{Math.round(progress.time / 60)}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Export and deeper drill-down coming soon.</p>
          <a href={`/org/${org.slug}/admin/audit`} className="inline-flex items-center text-sm text-blue-600 hover:underline">
            View audit log →
          </a>
        </div>
      </div>
    </div>
  )
}
