import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createCourse, listCourses, requireInstitutionRole } from "@/server/institution"
import { getSessionWithRole } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

async function getOnboardingChecklist(institutionId: string) {
  const [{ count: educatorCount }, { count: studentCount }, { count: courseCount }, { count: inviteCount }] = await Promise.all([
    supabaseAdmin
      .from("institution_memberships")
      .select("id", { head: true, count: "exact" })
      .eq("institution_id", institutionId)
      .eq("status", "ACTIVE")
      .eq("role", "EDUCATOR"),
    supabaseAdmin
      .from("institution_memberships")
      .select("id", { head: true, count: "exact" })
      .eq("institution_id", institutionId)
      .eq("status", "ACTIVE")
      .eq("role", "STUDENT"),
    supabaseAdmin
      .from("courses")
      .select("id", { head: true, count: "exact" })
      .eq("institution_id", institutionId),
    supabaseAdmin
      .from("invites")
      .select("id", { head: true, count: "exact" })
      .eq("institution_id", institutionId)
      .eq("role", "EDUCATOR")
  ])

  return [
    { label: "Workspace created", complete: true },
    { label: "First educator invited", complete: (inviteCount || 0) > 0 || (educatorCount || 0) > 0 },
    { label: "First cohort created", complete: (courseCount || 0) > 1 },
    { label: "First case assigned", complete: false },
    { label: "First student enrolled", complete: (studentCount || 0) > 0 }
  ]
}

export default async function InstitutionCoursesPage() {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/institution/login?next=/institution/courses")
  }

  const context = await requireInstitutionRole(sessionWithRole.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])
  const courses = await listCourses(context.institution.id)
  const checklist = context.membership.role === "INSTITUTION_ADMIN" ? await getOnboardingChecklist(context.institution.id) : null

  async function createCourseAction(formData: FormData) {
    "use server"

    const serverSession = await getSessionWithRole()

    if (!serverSession) {
      redirect("/institution/login?next=/institution/courses")
    }

    const serverContext = await requireInstitutionRole(serverSession.session.user.id, ["INSTITUTION_ADMIN"])

    await createCourse({
      institutionId: serverContext.institution.id,
      name: String(formData.get("name") || ""),
      code: String(formData.get("code") || "") || null,
      term: String(formData.get("term") || "") || null,
      startDate: String(formData.get("start_date") || "") || null,
      endDate: String(formData.get("end_date") || "") || null
    })

    revalidatePath("/institution/courses")
    redirect("/institution/courses")
  }

  const canCreateCourse = context.membership.role === "INSTITUTION_ADMIN"

  return (
    <main className="space-y-6">
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Courses</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Institution Courses</h1>
        <p className="mt-2 text-sm text-slate-600">Manage course rosters, educators, and performance analytics.</p>
      </div>

      {checklist ? (
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Onboarding Checklist</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Keep rollout moving</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {checklist.map((item) => (
              <div key={item.label} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                <span className="mr-2">{item.complete ? "[Done]" : "[Todo]"}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {canCreateCourse ? (
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">Create course</h2>
          <form action={createCourseAction} className="mt-4 grid gap-3 md:grid-cols-5">
            <input name="name" required placeholder="Course name" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
            <input name="code" placeholder="Code (optional)" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
            <input name="term" placeholder="Term" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
            <input type="date" name="start_date" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
            <input type="date" name="end_date" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
            <div className="md:col-span-5">
              <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
                Create Course
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article key={course.id} className="surface-card p-5">
            <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
            <p className="mt-1 text-xs text-slate-500">Code: {course.code || "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Term: {course.term || "—"}</p>
            <div className="mt-4 flex items-center gap-3">
              <Link href={`/institution/courses/${course.id}/students`} className="text-sm font-semibold text-primary hover:underline">
                Open Course
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
