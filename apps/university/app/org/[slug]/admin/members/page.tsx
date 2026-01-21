import { redirect } from "next/navigation"
import { resolveTenant } from "@/lib/tenant"
import { createSupabaseServerClient } from "@/lib/supabaseServer"
import type { OrgMember } from "@/lib/types"
import { assignStudentTeacher, bulkInviteAction, inviteMemberAction, removeMember, updateMemberRole } from "./actions"
import { BulkInviteUploader } from "./BulkInviteUploader"
import { OrgAdminHeader } from "@/components/org-admin/OrgAdminHeader"

interface OrgMembersPageProps {
  params: { slug: string }
  searchParams?: { sent?: string; q?: string; role?: string; activity?: string; sort?: string }
}

async function requireOrgAdmin(slug: string) {
  const tenant = await resolveTenant()

  if (!tenant.userId) {
    redirect("/login")
  }

  if (!tenant.organization || tenant.organization.slug !== slug) {
    redirect("/org-admin")
  }

  if (tenant.membership?.role !== "org_admin") {
    redirect("/")
  }

  return tenant
}

async function getMembers(orgId: string) {
  const supabase = createSupabaseServerClient()

  const { data: memberRows, error: memberError } = await supabase.from("org_members").select("*").eq("org_id", orgId)

  if (memberError) {
    console.error("getMembers error:", memberError)
    return []
  }

  const members: (OrgMember & { email?: string; name?: string; lastActivity?: string; classroomId?: string | null })[] =
    memberRows.map((row) => ({
    orgId: row.org_id as string,
    userId: row.user_id as string,
    role: row.role as OrgMember["role"],
    createdAt: row.created_at as string,
    email: (row as any).email,
    name: (row as any).name,
    classroomId: (row as any).classroom_id ?? null,
    lastActivity: undefined,
  }))

  const userIds = members.map((m) => m.userId)
  if (!userIds.length) return members

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, name, classroom_id")
    .in("id", userIds)

  if (usersError) {
    console.error("getMembers users error:", usersError)
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("student_progress")
    .select("student_id, last_activity")
    .in("student_id", userIds)

  if (progressError) {
    console.error("getMembers progress error:", progressError)
  }

  const progressMap = new Map((progressRows ?? []).map((p) => [p.student_id as string, p.last_activity as string]))
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]))
  return members.map((m) => ({
    ...m,
    email: userMap.get(m.userId)?.email ?? m.email,
    name: userMap.get(m.userId)?.name ?? m.name,
    classroomId: userMap.get(m.userId)?.classroom_id ?? m.classroomId ?? null,
    lastActivity: progressMap.get(m.userId),
  }))
}

async function getTeachers(orgId: string) {
  const supabase = createSupabaseServerClient()
  const { data: memberRows, error } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "teacher")
  if (error) {
    console.error("getTeachers error:", error)
    return []
  }
  const userIds = (memberRows ?? []).map((m) => m.user_id as string)
  if (!userIds.length) return []
  const { data: users, error: userErr } = await supabase.from("users").select("id, name, email").in("id", userIds)
  if (userErr) {
    console.error("getTeachers users error:", userErr)
    return []
  }
  return users ?? []
}

async function getClassroomTeacherMap(classroomIds: string[]) {
  if (!classroomIds.length) return new Map<string, string>()
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("classrooms").select("id, teacher_id").in("id", classroomIds)
  if (error) {
    console.error("getClassroomTeacherMap error:", error)
    return new Map<string, string>()
  }
  return new Map((data ?? []).map((row) => [row.id as string, row.teacher_id as string]))
}

function daysSince(value?: string | null) {
  if (!value) return null
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((Date.now() - new Date(value).getTime()) / dayMs)
}

export default async function OrgMembersPage({ params, searchParams }: OrgMembersPageProps) {
  const tenant = await requireOrgAdmin(params.slug)
  const members = await getMembers(tenant.organization!.id)
  const teachers = await getTeachers(tenant.organization!.id)
  const classroomIds = members.map((m) => m.classroomId).filter(Boolean) as string[]
  const classroomTeacherMap = await getClassroomTeacherMap(classroomIds)
  const sent = searchParams?.sent ?? null
  const queryRaw = (searchParams?.q ?? "").trim()
  const query = queryRaw.toLowerCase()
  const roleFilter = (searchParams?.role ?? "all").toLowerCase()
  const activityFilter = (searchParams?.activity ?? "all").toLowerCase()
  const sort = (searchParams?.sort ?? "recent").toLowerCase()

  const filteredMembers = members.filter((member) => {
    const matchesQuery =
      !query ||
      [member.name, member.email, member.userId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    const matchesRole = roleFilter === "all" || member.role === roleFilter
    const activityDays = daysSince(member.lastActivity)
    const matchesActivity =
      activityFilter === "all" ||
      (activityFilter === "active" && activityDays !== null && activityDays <= 7) ||
      (activityFilter === "warming" && activityDays !== null && activityDays > 7 && activityDays <= 30) ||
      (activityFilter === "dormant" && activityDays !== null && activityDays > 30) ||
      (activityFilter === "none" && activityDays === null)
    return matchesQuery && matchesRole && matchesActivity
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sort === "name") {
      return (a.name ?? "").localeCompare(b.name ?? "")
    }
    if (sort === "role") {
      return a.role.localeCompare(b.role)
    }
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
    return bTime - aTime
  })

  const buildQuery = (overrides: Partial<Record<"q" | "role" | "activity" | "sort", string>>) => {
    const params = new URLSearchParams()
    const values = {
      q: queryRaw,
      role: roleFilter,
      activity: activityFilter,
      sort,
      ...overrides,
    }
    Object.entries(values).forEach(([key, value]) => {
      if (!value) return
      if (key === "role" && value === "all") return
      if (key === "activity" && value === "all") return
      if (key === "sort" && value === "recent") return
      params.set(key, value)
    })
    const qs = params.toString()
    return qs ? `?${qs}` : ""
  }

  const filterChips = [
    queryRaw ? { label: `Search: ${queryRaw}`, href: buildQuery({ q: "" }) } : null,
    roleFilter !== "all" ? { label: `Role: ${roleFilter}`, href: buildQuery({ role: "all" }) } : null,
    activityFilter !== "all" ? { label: `Activity: ${activityFilter}`, href: buildQuery({ activity: "all" }) } : null,
    sort !== "recent" ? { label: `Sort: ${sort}`, href: buildQuery({ sort: "recent" }) } : null,
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="admin-canvas">
      <div className="max-w-6xl mx-auto space-y-6">
        <OrgAdminHeader
          orgSlug={tenant.organization!.slug}
          title="Members"
          description={`Manage roles and remove members in ${tenant.organization!.name}.`}
          active="members"
        />

        <div className="rounded-2xl border border-border bg-white/80 p-5 shadow-sm space-y-4">
          {sent && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Invite sent successfully {sent === "bulk" ? "(bulk)" : ""}.
            </div>
          )}
          <h2 className="text-lg font-semibold">Invite member</h2>
          <p className="text-sm text-muted-foreground">Send a one-time invite to join this organization.</p>
          <form action={inviteMemberAction} className="grid gap-2 sm:grid-cols-5 sm:items-center">
            <input type="hidden" name="orgSlug" value={tenant.organization!.slug} />
            <input type="hidden" name="orgId" value={tenant.organization!.id} />
            <input
              name="name"
              type="text"
              placeholder="Full name"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="student@example.com"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            />
            <select
              name="teacherId"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Assign teacher (optional)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
            <select
              name="role"
              defaultValue="student"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="org_admin">Org admin</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
            >
              Send invite
            </button>
          </form>
          <p className="text-xs text-muted-foreground">
            An invite email will be sent. If the user already exists, they are added immediately.
          </p>
          <div className="border-t border-border pt-4 space-y-2">
            <h3 className="text-sm font-semibold">Bulk invite (CSV upload)</h3>
            <BulkInviteUploader
              orgSlug={tenant.organization!.slug}
              orgId={tenant.organization!.id}
              action={bulkInviteAction}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm space-y-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
              <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Name, email, or ID" />
            </div>
            <div className="min-w-[150px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
              <select name="role" defaultValue={roleFilter}>
                <option value="all">All roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="org_admin">Org admin</option>
              </select>
            </div>
            <div className="min-w-[160px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</label>
              <select name="activity" defaultValue={activityFilter}>
                <option value="all">All activity</option>
                <option value="active">Active 7d</option>
                <option value="warming">Warming 8-30d</option>
                <option value="dormant">Dormant 30d+</option>
                <option value="none">No activity</option>
              </select>
            </div>
            <div className="min-w-[150px] space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</label>
              <select name="sort" defaultValue={sort}>
                <option value="recent">Most recent</option>
                <option value="name">Name</option>
                <option value="role">Role</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Apply
            </button>
            <a
              href={`/org/${tenant.organization!.slug}/admin/members`}
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

        <div className="rounded-2xl border border-border bg-white/80 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Email / Activity</div>
            <div className="col-span-3">Teacher</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border/70">
            {sortedMembers.map((member) => (
              <div
                key={member.userId}
                className="grid grid-cols-12 items-center px-4 py-3 text-sm transition-colors hover:bg-slate-50/80"
              >
                <div className="col-span-3">
                  <div className="font-medium">{member.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{member.userId}</div>
                </div>
                <div className="col-span-3 text-muted-foreground">
                  <div>{member.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.lastActivity ? `Last activity: ${new Date(member.lastActivity).toLocaleDateString()}` : "Last activity: —"}
                  </div>
                </div>
                <div className="col-span-3">
                  {member.role === "student" ? (
                    <form
                      action={async (formData) => {
                        "use server"
                        const teacherId = (formData.get("teacherId") as string | null) || null
                        await assignStudentTeacher(member.orgId, member.userId, teacherId)
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="teacherId"
                        defaultValue={member.classroomId ? classroomTeacherMap.get(member.classroomId) ?? "" : ""}
                        className="w-full rounded-lg border border-input bg-white px-2 py-1 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || t.email}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs text-blue-600 hover:underline">
                        Update
                      </button>
                    </form>
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
                <div className="col-span-2">
                  <form
                    action={async (formData) => {
                      "use server"
                      const newRole = formData.get("role") as OrgMember["role"]
                      await updateMemberRole(member.orgId, member.userId, newRole)
                    }}
                  >
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="w-full rounded-lg border border-input bg-white px-2 py-1 text-sm"
                      disabled={tenant.userId === member.userId}
                    >
                      <option value="org_admin">Org admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                    </select>
                  </form>
                </div>
                <div className="col-span-1 text-right">
                  <form
                    action={async () => {
                      "use server"
                      await removeMember(member.orgId, member.userId)
                    }}
                  >
                    <button
                      type="submit"
                      disabled={tenant.userId === member.userId}
                      className="text-red-600 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {!sortedMembers.length && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No members match the current filters.
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {sortedMembers.length} of {members.length} members.
        </div>
      </div>
    </div>
  )
}
