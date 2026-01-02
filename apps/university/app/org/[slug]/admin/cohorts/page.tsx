import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import { getOrgContext, getCohortsForOrg } from "@/lib/orgs"

interface CohortsPageProps {
  params: { slug: string }
}

type MemberMap = Map<string, { role: string; email?: string | null; name?: string | null }>

async function requireOrgAdmin(slug: string) {
  const ctx = await getOrgContext()
  if (!ctx.userId) redirect("/login")
  const org = ctx.organizations.find((o) => o.slug === slug)
  if (!org) redirect("/org-admin")
  const membership = ctx.memberships.find((m) => m.orgId === org.id)
  if (!membership || membership.role !== "org_admin") redirect("/")
  return { org, membership, ctx }
}

async function addToCohort(orgId: string, cohortId: string, userId: string) {
  "use server"
  const supabase = createSupabaseServerClient()
  const ctx = await getOrgContext()
  const org = ctx.organizations.find((o) => o.id === orgId)
  const membership = ctx.memberships.find((m) => m.orgId === orgId)
  if (!org || membership?.role !== "org_admin") throw new Error("Not authorized")

  const { error } = await supabase
    .from("cohort_members")
    .upsert({ cohort_id: cohortId, user_id: userId })

  if (error) throw new Error(error.message)
  revalidatePath(`/org/${org.slug}/admin/cohorts`)
}

async function removeFromCohort(orgId: string, cohortId: string, userId: string) {
  "use server"
  const supabase = createSupabaseServerClient()
  const ctx = await getOrgContext()
  const org = ctx.organizations.find((o) => o.id === orgId)
  const membership = ctx.memberships.find((m) => m.orgId === orgId)
  if (!org || membership?.role !== "org_admin") throw new Error("Not authorized")

  const { error } = await supabase
    .from("cohort_members")
    .delete()
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
  revalidatePath(`/org/${org.slug}/admin/cohorts`)
}

async function bulkAddByEmails(orgId: string, cohortId: string, emails: string[]) {
  "use server"
  const supabase = createSupabaseServerClient()
  const ctx = await getOrgContext()
  const org = ctx.organizations.find((o) => o.id === orgId)
  const membership = ctx.memberships.find((m) => m.orgId === orgId)
  if (!org || membership?.role !== "org_admin") throw new Error("Not authorized")

  if (!emails.length) return
  const { data: users } = await supabase.from("users").select("id, email").in("email", emails)
  const userIds = (users ?? []).map((u) => u.id as string)
  if (!userIds.length) return

  const rows = userIds.map((id) => ({ cohort_id: cohortId, user_id: id }))
  await supabase.from("cohort_members").upsert(rows)
  revalidatePath(`/org/${org.slug}/admin/cohorts`)
}

export default async function CohortsPage({ params }: CohortsPageProps) {
  const { org } = await requireOrgAdmin(params.slug)
  const supabase = createSupabaseServerClient()

  const [cohorts, orgMemberRows, entitlements] = await Promise.all([
    getCohortsForOrg(org.id),
    supabase.from("org_members").select("*").eq("org_id", org.id),
    supabase.from("entitlements").select("*").eq("org_id", org.id).maybeSingle(),
  ])

  if (!entitlements?.data?.cohorts_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Cohorts disabled</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cohort features are turned off for this organization. Ask a platform admin to enable Cohorts in entitlements.
          </p>
          <a href={`/org/${org.slug}/admin`} className="mt-4 inline-flex items-center text-sm text-blue-600 hover:underline">
            ← Back to admin
          </a>
        </div>
      </div>
    )
  }

  const members = orgMemberRows.data ?? []
  const userIds = members.map((m) => m.user_id as string)
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, email, name").in("id", userIds)
    : { data: [] }

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))
  const memberMap: MemberMap = new Map(
    members.map((m) => [
      m.user_id as string,
      {
        role: m.role as string,
        email: userMap.get(m.user_id as string)?.email ?? null,
        name: userMap.get(m.user_id as string)?.name ?? null,
      },
    ])
  )

  const cohortIds = cohorts.map((c) => c.id)
  const { data: cohortMembersRows } = cohortIds.length
    ? await supabase.from("cohort_members").select("*").in("cohort_id", cohortIds)
    : { data: [] }
  const cohortMembers = cohortMembersRows ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Org Admin</p>
            <h1 className="text-3xl font-bold">Cohorts</h1>
            <p className="text-muted-foreground mt-2">Create cohorts and assign teachers or students.</p>
          </div>
          <a href={`/org/${org.slug}/admin`} className="text-sm text-blue-600 hover:underline">
            ← Back to admin
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form
            action={async (formData) => {
              "use server"
              const supabase = createSupabaseServerClient()
              const name = (formData.get("name") as string | null)?.trim() ?? ""
              const term = (formData.get("term") as string | null)?.trim() ?? ""
              const ctx = await getOrgContext()
              const org = ctx.organizations.find((o) => o.slug === params.slug)
              const membership = ctx.memberships.find((m) => m.orgId === org?.id)
              if (!org || membership?.role !== "org_admin") redirect("/")
              if (!name) redirect(`/org/${params.slug}/admin/cohorts`)
              await supabase.from("cohorts").insert({ org_id: org.id, name, term: term || null })
              revalidatePath(`/org/${params.slug}/admin/cohorts`)
              redirect(`/org/${params.slug}/admin/cohorts`)
            }}
            className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create cohort</h2>
            <input
              name="name"
              placeholder="Cardio Module 2026"
              required
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="term"
              placeholder="Spring 2026 (optional)"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
            >
              Add cohort
            </button>
          </form>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Bulk add students (CSV)</h2>
            <p className="text-sm text-muted-foreground">Add multiple students to a selected cohort by email.</p>
            <form
              action={async (formData) => {
                "use server"
                const cohortId = formData.get("cohort_id") as string
                const raw = (formData.get("emails") as string | null) ?? ""
                const emails = raw
                  .split(/[\n,]+/)
                  .map((e) => e.trim())
                  .filter(Boolean)
                await bulkAddByEmails(org.id, cohortId, emails)
              }}
              className="space-y-2"
            >
              <select
                name="cohort_id"
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                defaultValue={cohorts[0]?.id}
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <textarea
                name="emails"
                rows={3}
                placeholder="student1@uni.edu, student2@uni.edu"
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
              >
                Add to cohort
              </button>
              <p className="text-xs text-muted-foreground">Emails must already belong to this organization.</p>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {cohorts.map((cohort) => {
            const membersForCohort = cohortMembers.filter((cm) => cm.cohort_id === cohort.id)
            const teacherMembers = membersForCohort.filter((cm) => memberMap.get(cm.user_id as string)?.role === "teacher")
            const studentMembers = membersForCohort.filter((cm) => memberMap.get(cm.user_id as string)?.role === "student")

            return (
              <div key={cohort.id} className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{cohort.name}</h3>
                    <p className="text-sm text-muted-foreground">{cohort.term || "No term"} · Created {new Date(cohort.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Members: {membersForCohort.length}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Teachers</h4>
                    </div>
                    <form
                      action={async (formData) => {
                        "use server"
                        const userId = formData.get("teacher_id") as string
                        await addToCohort(org.id, cohort.id, userId)
                      }}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <select
                        name="teacher_id"
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                      >
                        {members
                          .filter((m) => m.role === "teacher" || m.role === "org_admin")
                          .map((m) => (
                            <option key={m.user_id as string} value={m.user_id as string}>
                              {memberMap.get(m.user_id as string)?.name || memberMap.get(m.user_id as string)?.email || m.user_id}
                            </option>
                          ))}
                      </select>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Add teacher
                      </button>
                    </form>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {teacherMembers.map((cm) => {
                        const info = memberMap.get(cm.user_id as string)
                        return (
                          <div key={cm.user_id as string} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div>
                              <div className="font-medium">{info?.name ?? "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{info?.email ?? cm.user_id}</div>
                            </div>
                            <form
                              action={async () => {
                                "use server"
                                await removeFromCohort(org.id, cohort.id, cm.user_id as string)
                              }}
                            >
                              <button className="text-xs text-red-600 hover:underline" type="submit">
                                Remove
                              </button>
                            </form>
                          </div>
                        )
                      })}
                      {!teacherMembers.length && <div className="px-3 py-2 text-sm text-muted-foreground">No teachers assigned</div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Students</h4>
                    </div>
                    <form
                      action={async (formData) => {
                        "use server"
                        const userId = formData.get("student_id") as string
                        await addToCohort(org.id, cohort.id, userId)
                      }}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <select
                        name="student_id"
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                      >
                        {members
                          .filter((m) => m.role === "student")
                          .map((m) => (
                            <option key={m.user_id as string} value={m.user_id as string}>
                              {memberMap.get(m.user_id as string)?.name || memberMap.get(m.user_id as string)?.email || m.user_id}
                            </option>
                          ))}
                      </select>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Add student
                      </button>
                    </form>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {studentMembers.map((cm) => {
                        const info = memberMap.get(cm.user_id as string)
                        return (
                          <div key={cm.user_id as string} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div>
                              <div className="font-medium">{info?.name ?? "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{info?.email ?? cm.user_id}</div>
                            </div>
                            <form
                              action={async () => {
                                "use server"
                                await removeFromCohort(org.id, cohort.id, cm.user_id as string)
                              }}
                            >
                              <button className="text-xs text-red-600 hover:underline" type="submit">
                                Remove
                              </button>
                            </form>
                          </div>
                        )
                      })}
                      {!studentMembers.length && <div className="px-3 py-2 text-sm text-muted-foreground">No students assigned</div>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {!cohorts.length && (
            <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-muted-foreground">
              No cohorts yet. Create one to start assigning teachers and students.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
