import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { MailPlus, RefreshCw, UserRoundCog, UsersRound, XCircle } from "lucide-react"

import { StudentInviteForm } from "@/components/institution/StudentInviteForm"
import {
  inviteMembers,
  listPendingInstitutionInvites,
  listStarterCourses,
  listStarterPeople,
  requireStarterPortalContext,
  resendInstitutionInvite,
  revokeInstitutionInvite,
  setStudentEducator
} from "@/server/institution"

export default async function InstitutionStudentsPage({ searchParams }: { searchParams?: { status?: string; courseId?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/students")
  const [courses, people, invites] = await Promise.all([
    listStarterCourses(context),
    listStarterPeople(context),
    listPendingInstitutionInvites(context)
  ])
  const selectedCourse = courses.find((course) => course.id === searchParams?.courseId) || null
  const students = people.filter((person) => person.role === "STUDENT" && (!selectedCourse || person.courses.some((course) => course.id === selectedCourse.id)))
  const educators = people.filter((person) => person.role === "EDUCATOR")
  const pendingInvites = invites.filter((invite) => invite.role === "STUDENT" && (!selectedCourse || invite.courseId === selectedCourse.id))
  const canManage = context.membership.role === "INSTITUTION_ADMIN"

  async function inviteStudentAction(formData: FormData) {
    "use server"
    const { context: actionContext, sessionWithRole: actionSession } = await requireStarterPortalContext("/institution/students")
    if (actionContext.membership.role !== "INSTITUTION_ADMIN") throw new Error("Not authorized")
    const courseId = String(formData.get("course_id") || "")
    const name = String(formData.get("name") || "").trim()
    const email = String(formData.get("email") || "").trim()
    const educatorEmail = String(formData.get("educator_email") || "").trim()
    const summary = await inviteMembers({
      institutionId: actionContext.institution.id,
      courseId,
      invitedByUserId: actionSession.session.user.id,
      role: "STUDENT",
      rows: [{ email, name, metadata: { name, student_name: name, educator_email: educatorEmail || null } }]
    })
    revalidatePath("/institution/students")
    redirectWithStatus(summary.invited_count ? "invited" : "not-sent")
  }

  async function assignEducatorAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/students")
    await setStudentEducator({
      context: actionContext,
      courseId: String(formData.get("course_id") || ""),
      studentUserId: String(formData.get("student_user_id") || ""),
      educatorUserId: String(formData.get("educator_user_id") || "") || null
    })
    revalidatePath("/institution/students")
    redirectWithStatus("assigned")
  }

  async function resendAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/students")
    await resendInstitutionInvite(actionContext, String(formData.get("invite_id") || ""))
    revalidatePath("/institution/students")
    redirectWithStatus("resent")
  }

  async function revokeAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/students")
    await revokeInstitutionInvite(actionContext, String(formData.get("invite_id") || ""))
    revalidatePath("/institution/students")
    redirectWithStatus("revoked")
  }

  const statusCopy: Record<string, string> = {
    invited: "Student invitation sent.",
    "not-sent": "The invitation was not sent. Check for an existing invite or email delivery error.",
    assigned: "Responsible educator updated.",
    resent: "Invitation refreshed and sent again.",
    revoked: "Invitation revoked."
  }

  return (
    <main>
      <header className="institution-page-header">
        <div>
          <p className="institution-eyebrow">People</p>
          <h1 className="institution-title">Students</h1>
          <p className="institution-subtitle">Manage enrollment and make ownership explicit by assigning every student to a responsible educator in each class.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {courses.length > 1 ? <form method="get" className="flex items-center gap-2"><select name="courseId" defaultValue={selectedCourse?.id || ""} className="institution-input h-10 min-w-[190px]"><option value="">All classes</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><button className="institution-button-secondary h-10">Filter</button></form> : null}
          {canManage && (selectedCourse || courses[0]) ? <Link href={`/institution/courses/${(selectedCourse || courses[0]).id}/students`} className="institution-button-secondary"><UsersRound className="h-4 w-4" /> CSV import</Link> : null}
        </div>
      </header>

      {searchParams?.status && statusCopy[searchParams.status] ? <div className="mb-5 rounded-[10px] border border-[#bdd1ff] bg-[#eef3ff] px-4 py-3 text-sm font-medium text-[#0047cc]">{statusCopy[searchParams.status]}</div> : null}

      <section className={`grid gap-6 ${canManage ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        <div className="space-y-6">
          <div className="institution-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e8e6df] px-5 py-4"><div><h2 className="text-base font-semibold text-[#0e0f12]">Active students</h2><p className="mt-1 text-xs text-[#8a8881]">{students.length} students visible to you</p></div><UsersRound className="h-5 w-5 text-[#0066ff]" /></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-[#f5f3ed] text-[10px] uppercase tracking-[0.12em] text-[#77746d]"><tr><th className="px-5 py-3 font-semibold">Student</th><th className="px-4 py-3 font-semibold">Class</th><th className="px-4 py-3 font-semibold">Responsible educator</th><th className="px-5 py-3 font-semibold">Joined</th></tr></thead>
                <tbody className="divide-y divide-[#efede7]">
                  {students.flatMap((student) => student.courses.filter((course) => !selectedCourse || course.id === selectedCourse.id).map((course) => {
                    const currentAssignment = student.educatorAssignments.find((assignment) => assignment.courseId === course.id)
                    const courseEducators = educators.filter((educator) => educator.courses.some((item) => item.id === course.id))
                    return (
                      <tr key={`${student.userId}-${course.id}`}>
                        <td className="px-5 py-4"><p className="font-semibold text-[#252521]">{student.name || "Student"}</p><p className="mt-0.5 text-xs text-[#8a8881]">{student.email}</p></td>
                        <td className="px-4 py-4 text-xs font-medium text-[#65635d]">{course.name}</td>
                        <td className="px-4 py-4">
                          {canManage ? (
                            <form action={assignEducatorAction} className="flex items-center gap-2">
                              <input type="hidden" name="course_id" value={course.id} /><input type="hidden" name="student_user_id" value={student.userId} />
                              <select name="educator_user_id" defaultValue={currentAssignment?.educatorUserId || ""} className="h-9 min-w-[190px] rounded-[8px] border border-[#d8d5cc] bg-white px-3 text-xs outline-none focus:border-[#0066ff]">
                                <option value="">Unassigned</option>{courseEducators.map((educator) => <option key={educator.userId} value={educator.userId}>{educator.name || educator.email}</option>)}
                              </select>
                              <button aria-label="Save educator assignment" className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#0e0f12] text-white"><UserRoundCog className="h-4 w-4" /></button>
                            </form>
                          ) : <span className="text-xs font-medium text-[#65635d]">{currentAssignment?.educatorName || "Not assigned"}</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#8a8881]">{new Date(student.joinedAt).toLocaleDateString()}</td>
                      </tr>
                    )
                  }))}
                  {!students.length ? <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-[#8a8881]">No active students yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          {canManage ? <div className="institution-panel overflow-hidden"><div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Pending invitations</h2><p className="mt-1 text-xs text-[#8a8881]">Students appear in the roster after activating their account.</p></div><div className="divide-y divide-[#efede7]">{pendingInvites.map((invite) => <div key={invite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#252521]">{invite.email}</p><p className="mt-1 text-xs text-[#8a8881]">{invite.courseName || "Class"} · {invite.expired ? "Expired" : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}</p>{invite.deliveryError ? <p className="mt-1 text-xs font-medium text-[#b42318]">{invite.deliveryError}</p> : null}</div><div className="flex gap-2"><form action={resendAction}><input type="hidden" name="invite_id" value={invite.id} /><button className="institution-button-secondary h-9 px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Resend</button></form><form action={revokeAction}><input type="hidden" name="invite_id" value={invite.id} /><button className="inline-flex h-9 items-center gap-1 rounded-[9px] border border-[#f0c4bd] bg-[#fff5f3] px-3 text-xs font-semibold text-[#b42318]"><XCircle className="h-3.5 w-3.5" /> Revoke</button></form></div></div>)}{!pendingInvites.length ? <p className="px-5 py-9 text-center text-sm text-[#8a8881]">No pending student invitations.</p> : null}</div></div> : null}
        </div>

        {canManage ? <aside className="institution-panel h-fit p-5 xl:sticky xl:top-8"><div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eef3ff] text-[#0066ff]"><MailPlus className="h-5 w-5" /></div><h2 className="mt-4 text-lg font-semibold text-[#0e0f12]">Invite a student</h2><p className="mt-1 text-xs leading-5 text-[#77746d]">Choose a class and optional responsible educator. Ownership is applied when the student activates access.</p><StudentInviteForm action={inviteStudentAction} courses={courses.map(({ id, name }) => ({ id, name }))} educators={educators.map((educator) => ({ userId: educator.userId, email: educator.email, name: educator.name, courseIds: educator.courses.map((course) => course.id) }))} defaultCourseId={selectedCourse?.id || ""} /></aside> : null}
      </section>
    </main>
  )
}

function redirectWithStatus(status: string): never {
  redirect(`/institution/students?status=${status}`)
}
