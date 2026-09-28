import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Archive, ArrowUpRight, CalendarClock, CheckCircle2, ClipboardList, Plus, Stethoscope } from "lucide-react"

import {
  archiveStarterAssignment,
  createStarterAssignment,
  listStarterAssignments,
  listStarterCourses,
  listInstitutionAssignableCases,
  requireStarterPortalContext,
} from "@/server/institution"

export default async function InstitutionAssignmentsPage({ searchParams }: { searchParams?: { status?: string; courseId?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/assignments")
  const [courses, allAssignments, caseLibrary] = await Promise.all([listStarterCourses(context), listStarterAssignments(context), listInstitutionAssignableCases(context)])
  const selectedCourse = courses.find((course) => course.id === searchParams?.courseId) || null
  const assignments = selectedCourse ? allAssignments.filter((assignment) => assignment.courseId === selectedCourse.id) : allAssignments

  async function createAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/assignments")
    await createStarterAssignment({
      context: actionContext,
      courseId: String(formData.get("course_id") || ""),
      title: String(formData.get("title") || ""),
      instructions: String(formData.get("instructions") || "") || null,
      dueAt: String(formData.get("due_at") || "") || null,
      caseIds: formData.getAll("case_ids").map(String)
    })
    revalidatePath("/institution/assignments")
    redirect("/institution/assignments?status=created")
  }

  async function archiveAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/assignments")
    await archiveStarterAssignment(actionContext, String(formData.get("assignment_id") || ""))
    revalidatePath("/institution/assignments")
    redirect("/institution/assignments?status=archived")
  }

  return (
    <main>
      <header className="institution-page-header">
        <div>
          <p className="institution-eyebrow">Learning operations</p>
          <h1 className="institution-title">Assignments</h1>
          <p className="institution-subtitle">Publish curated case sets to a class. Administrators assign the entire class; educators assign only the students they own.</p>
        </div>
        {courses.length > 1 ? <form method="get" className="flex items-center gap-2"><select name="courseId" defaultValue={selectedCourse?.id || ""} className="institution-input h-10 min-w-[190px]"><option value="">All classes</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><button className="institution-button-secondary h-10">Filter</button></form> : null}
      </header>

      {searchParams?.status ? <div className="mb-5 rounded-[10px] border border-[#bde0c5] bg-[#edf8ef] px-4 py-3 text-sm font-medium text-[#24713a]">{searchParams.status === "created" ? "Assignment published." : "Assignment archived."}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const progress = assignment.assignedCount ? Math.round((assignment.completedCount / assignment.assignedCount) * 100) : 0
            const cases = caseLibrary.filter((item) => assignment.caseIds.includes(item.id))
            return (
              <article key={assignment.id} className="institution-panel overflow-hidden">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0047cc]">{assignment.courseName}</span>{assignment.dueAt ? <span className="inline-flex items-center gap-1 text-xs text-[#77746d]"><CalendarClock className="h-3.5 w-3.5" /> Due {new Date(assignment.dueAt).toLocaleString()}</span> : <span className="text-xs text-[#aaa79f]">No deadline</span>}</div>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#0e0f12]">{assignment.title}</h2>
                    {assignment.instructions ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6a65]">{assignment.instructions}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">{cases.map((item) => <Link key={item.id} href={item.href} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#dedbd2] bg-[#f8f7f2] px-2.5 py-2 text-xs font-semibold text-[#4f4d47]"><Stethoscope className="h-3.5 w-3.5 text-[#0066ff]" />{item.title}<ArrowUpRight className="h-3 w-3 text-[#8a8881]" /></Link>)}</div>
                  </div>
                  <form action={archiveAction}><input type="hidden" name="assignment_id" value={assignment.id} /><button className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#dedbd2] bg-white px-3 text-xs font-semibold text-[#77746d]"><Archive className="h-3.5 w-3.5" /> Archive</button></form>
                </div>
                <div className="border-t border-[#e8e6df] bg-[#faf9f5] px-5 py-4">
                  <div className="flex items-center justify-between text-xs"><span className="font-medium text-[#65635d]">{assignment.completedCount} of {assignment.assignedCount} students completed</span><span className="font-semibold text-[#0e0f12]">{progress}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e1d9]"><div className="h-full rounded-full bg-[#0066ff]" style={{ width: `${progress}%` }} /></div>
                </div>
              </article>
            )
          })}
          {!assignments.length ? <div className="institution-panel py-16 text-center"><ClipboardList className="mx-auto h-7 w-7 text-[#aaa79f]" /><h2 className="mt-4 text-base font-semibold text-[#353431]">No assignments yet</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#8a8881]">Create the first case set using the form. Students will see assigned cases in their learning area.</p></div> : null}
        </div>

        <aside className="institution-panel h-fit p-5 xl:sticky xl:top-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0e0f12] text-white"><Plus className="h-5 w-5" /></div>
          <h2 className="mt-4 text-lg font-semibold text-[#0e0f12]">New assignment</h2>
          <p className="mt-1 text-xs leading-5 text-[#77746d]">Select one or more case studies from your available library.</p>
          <form action={createAction} className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Class</span><select name="course_id" required defaultValue={selectedCourse?.id || ""} className="institution-input"><option value="">Choose a class</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Title</span><input name="title" required className="institution-input" placeholder="ECG interpretation checkpoint" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Instructions</span><textarea name="instructions" rows={3} className="w-full rounded-[9px] border border-[#d8d5cc] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0066ff]" placeholder="Complete each case and review your feedback." /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Deadline</span><input name="due_at" type="datetime-local" className="institution-input" /></label>
            <fieldset><legend className="mb-2 text-[11px] font-semibold text-[#65635d]">Cases</legend><div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">{caseLibrary.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[#e1ded6] bg-[#faf9f5] p-3 transition has-[:checked]:border-[#8eb3ff] has-[:checked]:bg-[#eef3ff]"><input type="checkbox" name="case_ids" value={item.id} className="mt-0.5 h-4 w-4 rounded border-[#c8c5bc] text-[#0066ff]" /><span><span className="block text-xs font-semibold text-[#252521]">{item.title}</span><span className="mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-[#8a8881]">{item.modality} · {item.difficulty} · {item.durationMin} min{item.trackId === "institution-authored" ? " · Custom" : ""}</span></span></label>)}</div></fieldset>
            <button className="institution-button-primary w-full"><CheckCircle2 className="h-4 w-4" /> Publish assignment</button>
          </form>
        </aside>
      </section>
    </main>
  )
}
