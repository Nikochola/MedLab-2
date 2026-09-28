import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ArrowRight, BookOpenCheck, Check, Circle, GraduationCap, Plus, UsersRound } from "lucide-react"

import { createCourse, listStarterCourses, requireStarterPortalContext } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

async function getRolloutChecklist(institutionId: string) {
  const [{ count: educatorCount }, { count: studentCount }, { count: courseCount }, { count: assignmentCount }] = await Promise.all([
    supabaseAdmin.from("institution_memberships").select("id", { head: true, count: "exact" }).eq("institution_id", institutionId).eq("status", "ACTIVE").eq("role", "EDUCATOR"),
    supabaseAdmin.from("institution_memberships").select("id", { head: true, count: "exact" }).eq("institution_id", institutionId).eq("status", "ACTIVE").eq("role", "STUDENT"),
    supabaseAdmin.from("courses").select("id", { head: true, count: "exact" }).eq("institution_id", institutionId).eq("is_archived", false),
    supabaseAdmin.from("case_assignments").select("id", { head: true, count: "exact" }).eq("institution_id", institutionId).eq("status", "PUBLISHED")
  ])

  return [
    { label: "Create a class", complete: (courseCount || 0) > 0, href: "#new-class" },
    { label: "Invite an educator", complete: (educatorCount || 0) > 0, href: "/institution/educators" },
    { label: "Enroll students", complete: (studentCount || 0) > 0, href: "/institution/students" },
    { label: "Publish a case assignment", complete: (assignmentCount || 0) > 0, href: "/institution/assignments" }
  ]
}

export default async function InstitutionCoursesPage({ searchParams }: { searchParams?: { status?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/courses")
  const [courses, checklist] = await Promise.all([
    listStarterCourses(context),
    context.membership.role === "INSTITUTION_ADMIN" ? getRolloutChecklist(context.institution.id) : Promise.resolve(null)
  ])
  const canCreate = context.membership.role === "INSTITUTION_ADMIN"

  async function createCourseAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/courses")
    if (actionContext.membership.role !== "INSTITUTION_ADMIN") throw new Error("Only administrators can create classes")

    await createCourse({
      institutionId: actionContext.institution.id,
      name: String(formData.get("name") || ""),
      code: String(formData.get("code") || "") || null,
      term: String(formData.get("term") || "") || null,
      startDate: String(formData.get("start_date") || "") || null,
      endDate: String(formData.get("end_date") || "") || null
    })

    revalidatePath("/institution/courses")
    redirect("/institution/courses?status=created")
  }

  return (
    <main>
      <header className="institution-page-header">
        <div>
          <p className="institution-eyebrow">Academic structure</p>
          <h1 className="institution-title">Classes</h1>
          <p className="institution-subtitle">Keep rosters, educators, assignments, and performance organized around the classes your institution already teaches.</p>
        </div>
        {canCreate ? <a href="#new-class" className="institution-button-primary"><Plus className="h-4 w-4" /> New class</a> : null}
      </header>

      {searchParams?.status === "created" ? <div className="mb-5 rounded-[10px] border border-[#bde0c5] bg-[#edf8ef] px-4 py-3 text-sm font-medium text-[#24713a]">Class created and ready for enrollment.</div> : null}

      {checklist ? (
        <section className="institution-panel mb-6 overflow-hidden">
          <div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Starter rollout</h2><p className="mt-1 text-xs text-[#8a8881]">Four concrete steps take a workspace from empty to teaching-ready.</p></div>
          <div className="grid gap-px bg-[#e8e6df] sm:grid-cols-2 xl:grid-cols-4">
            {checklist.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 bg-white px-5 py-4 transition hover:bg-[#faf9f5]">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${item.complete ? "bg-[#edf8ef] text-[#24713a]" : "bg-[#f0eee8] text-[#8a8881]"}`}>{item.complete ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}</span>
                <span className="text-xs font-semibold text-[#4f4d47]">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`grid gap-6 ${canCreate ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <div className="grid content-start gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <article key={course.id} className="institution-panel p-5">
              <div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eef3ff] text-[#0066ff]"><GraduationCap className="h-5 w-5" /></div><span className="rounded-full bg-[#f0eee8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#77746d]">{course.term || "Current"}</span></div>
              <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#0e0f12]">{course.name}</h2>
              <p className="mt-1 text-xs text-[#8a8881]">{course.code || "No class code"}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-[9px] bg-[#f5f3ed] px-3 py-3"><UsersRound className="h-3.5 w-3.5 text-[#0066ff]" /><p className="mt-2 text-lg font-semibold text-[#252521]">{course.studentCount}</p><p className="text-[10px] uppercase tracking-[0.08em] text-[#8a8881]">Students</p></div>
                <div className="rounded-[9px] bg-[#f5f3ed] px-3 py-3"><BookOpenCheck className="h-3.5 w-3.5 text-[#0066ff]" /><p className="mt-2 text-lg font-semibold text-[#252521]">{course.educatorCount}</p><p className="text-[10px] uppercase tracking-[0.08em] text-[#8a8881]">Educators</p></div>
              </div>
              <div className="mt-5 flex items-center gap-4 border-t border-[#ece9e2] pt-4">
                <Link href={`/institution/students?courseId=${course.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066ff]">Open roster <ArrowRight className="h-3.5 w-3.5" /></Link>
                <Link href={`/institution/analytics?courseId=${course.id}`} className="text-xs font-semibold text-[#65635d]">View analytics</Link>
              </div>
            </article>
          ))}
          {!courses.length ? <div className="institution-panel col-span-full py-16 text-center"><GraduationCap className="mx-auto h-7 w-7 text-[#aaa79f]" /><h2 className="mt-4 text-base font-semibold text-[#353431]">No classes available</h2><p className="mt-1 text-sm text-[#8a8881]">{canCreate ? "Create your first class to begin the rollout." : "Ask your institution administrator to assign you to a class."}</p></div> : null}
        </div>

        {canCreate ? (
          <aside id="new-class" className="institution-panel h-fit scroll-mt-8 p-5 xl:sticky xl:top-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0e0f12] text-white"><Plus className="h-5 w-5" /></div>
            <h2 className="mt-4 text-lg font-semibold text-[#0e0f12]">Create a class</h2>
            <p className="mt-1 text-xs leading-5 text-[#77746d]">Add the teaching context first, then invite educators and students.</p>
            <form action={createCourseAction} className="mt-5 space-y-4">
              <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Class name</span><input name="name" required className="institution-input" placeholder="Clinical ECG · Year 3" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Code</span><input name="code" className="institution-input" placeholder="MED-301" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Term</span><input name="term" className="institution-input" placeholder="Fall 2026" /></label></div>
              <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Start</span><input type="date" name="start_date" className="institution-input" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">End</span><input type="date" name="end_date" className="institution-input" /></label></div>
              <button className="institution-button-primary w-full"><Plus className="h-4 w-4" /> Create class</button>
            </form>
          </aside>
        ) : null}
      </section>
    </main>
  )
}
