import { redirect } from "next/navigation"
import { resolveTenant } from "@/lib/tenant"
import { getCohortsForOrg } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

interface OrgStudentPageProps {
  params: { slug: string }
}

export default async function OrgStudentPage({ params }: OrgStudentPageProps) {
  const tenant = await resolveTenant()

  if (!tenant.userId) {
    redirect("/login")
  }

  if (!tenant.organization || tenant.organization.slug !== params.slug) {
    redirect("/org-admin")
  }

  if (tenant.membership?.role !== "student") {
    redirect("/")
  }

  const supabase = createSupabaseServerClient()
  const cohorts = tenant.organization ? await getCohortsForOrg(tenant.organization.id) : []
  const { data: enrolledRows } = tenant.organization
    ? await supabase.from("cohort_members").select("cohort_id").eq("user_id", tenant.userId!)
    : { data: [] }
  const enrolled = new Set((enrolledRows ?? []).map((r) => r.cohort_id as string))

  async function joinCohort(formData: FormData) {
    "use server"
    const supabase = createSupabaseServerClient()
    const tenant = await resolveTenant()
    if (!tenant.organization || tenant.membership?.role !== "student") redirect("/")
    const cohortId = formData.get("cohort_id") as string
    await supabase.from("cohort_members").upsert({ cohort_id: cohortId, user_id: tenant.userId! })
    redirect(`/org/${tenant.organization.slug}/student`)
  }

  async function leaveCohort(formData: FormData) {
    "use server"
    const supabase = createSupabaseServerClient()
    const tenant = await resolveTenant()
    if (!tenant.organization || tenant.membership?.role !== "student") redirect("/")
    const cohortId = formData.get("cohort_id") as string
    await supabase.from("cohort_members").delete().eq("cohort_id", cohortId).eq("user_id", tenant.userId!)
    redirect(`/org/${tenant.organization.slug}/student`)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="pointer-events-none absolute -top-16 right-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="relative space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Student Workspace</p>
            <h1 className="text-3xl font-semibold">{tenant.organization.name}</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;re learning with {tenant.organization.name}. Access to features is controlled by your org.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/80 p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Your classes</h2>
          <div className="space-y-2 text-sm">
            {cohorts.map((cohort) => {
              const isEnrolled = enrolled.has(cohort.id)
              return (
                <div
                  key={cohort.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 transition-colors hover:bg-slate-50/80"
                >
                  <div>
                    <div className="font-medium">{cohort.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cohort.term || "No term"} · {new Date(cohort.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <form action={isEnrolled ? leaveCohort : joinCohort}>
                    <input type="hidden" name="cohort_id" value={cohort.id} />
                    <button
                      type="submit"
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        isEnrolled
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      {isEnrolled ? "Leave" : "Join"}
                    </button>
                  </form>
                </div>
              )
            })}
            {!cohorts.length && <p className="text-muted-foreground text-sm">No classes available yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/80 p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Practice</h2>
          <p className="text-muted-foreground text-sm">
            Use the ECG practice and cases modules available to you. (We&apos;ll link entitlements here.)
          </p>
        </div>
      </div>
    </div>
  )
}
