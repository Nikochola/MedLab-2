import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { BookOpenCheck, MailPlus, RefreshCw, ShieldCheck, UserRoundPlus, XCircle } from "lucide-react"

import {
  inviteMembers,
  listPendingInstitutionInvites,
  listStarterCourses,
  listStarterPeople,
  requireStarterPortalContext,
  resendInstitutionInvite,
  revokeInstitutionInvite
} from "@/server/institution"

export default async function InstitutionEducatorsPage({ searchParams }: { searchParams?: { status?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/educators")
  if (context.membership.role !== "INSTITUTION_ADMIN") redirect("/institution/overview")

  const [courses, people, invites] = await Promise.all([
    listStarterCourses(context),
    listStarterPeople(context),
    listPendingInstitutionInvites(context)
  ])
  const educators = people.filter((person) => person.role === "EDUCATOR")
  const pendingInvites = invites.filter((invite) => invite.role === "EDUCATOR")

  async function inviteEducatorAction(formData: FormData) {
    "use server"
    const { context: actionContext, sessionWithRole: actionSession } = await requireStarterPortalContext("/institution/educators")
    if (actionContext.membership.role !== "INSTITUTION_ADMIN") throw new Error("Not authorized")
    const courseId = String(formData.get("course_id") || "")
    const name = String(formData.get("name") || "").trim()
    const email = String(formData.get("email") || "").trim()
    const summary = await inviteMembers({
      institutionId: actionContext.institution.id,
      courseId,
      invitedByUserId: actionSession.session.user.id,
      role: "EDUCATOR",
      rows: [{ email, name, metadata: { name } }]
    })
    revalidatePath("/institution/educators")
    redirect(`/institution/educators?status=${summary.invited_count ? "invited" : "not-sent"}`)
  }

  async function resendAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/educators")
    await resendInstitutionInvite(actionContext, String(formData.get("invite_id") || ""))
    revalidatePath("/institution/educators")
    redirect("/institution/educators?status=resent")
  }

  async function revokeAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/educators")
    await revokeInstitutionInvite(actionContext, String(formData.get("invite_id") || ""))
    revalidatePath("/institution/educators")
    redirect("/institution/educators?status=revoked")
  }

  const statusCopy: Record<string, string> = {
    invited: "Educator invitation sent.",
    "not-sent": "The invitation was not sent. Check for an existing invite or email delivery error.",
    resent: "Invitation refreshed and sent again.",
    revoked: "Invitation revoked."
  }

  return (
    <main>
      <header className="institution-page-header">
        <div>
          <p className="institution-eyebrow">People</p>
          <h1 className="institution-title">Educators</h1>
          <p className="institution-subtitle">Invite teaching staff, assign them to classes, and see how many students they currently support.</p>
        </div>
      </header>

      {searchParams?.status && statusCopy[searchParams.status] ? (
        <div className="mb-5 rounded-[10px] border border-[#bdd1ff] bg-[#eef3ff] px-4 py-3 text-sm font-medium text-[#0047cc]">
          {statusCopy[searchParams.status]}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="institution-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e8e6df] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#0e0f12]">Active educators</h2>
                <p className="mt-1 text-xs text-[#8a8881]">{educators.length} teaching staff</p>
              </div>
              <BookOpenCheck className="h-5 w-5 text-[#0066ff]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#f5f3ed] text-[10px] uppercase tracking-[0.12em] text-[#77746d]">
                  <tr><th className="px-5 py-3 font-semibold">Educator</th><th className="px-4 py-3 font-semibold">Classes</th><th className="px-4 py-3 font-semibold">Assigned students</th><th className="px-5 py-3 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#efede7]">
                  {educators.map((educator) => (
                    <tr key={educator.userId}>
                      <td className="px-5 py-4"><p className="font-semibold text-[#252521]">{educator.name || "Educator"}</p><p className="mt-0.5 text-xs text-[#8a8881]">{educator.email}</p></td>
                      <td className="px-4 py-4 text-xs text-[#65635d]">{educator.courses.map((course) => course.name).join(", ") || "—"}</td>
                      <td className="px-4 py-4 font-semibold text-[#252521]">{educator.assignedStudentCount}</td>
                      <td className="px-5 py-4"><span className="inline-flex items-center gap-1 rounded-full bg-[#edf8ef] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#24713a]"><ShieldCheck className="h-3 w-3" /> Active</span></td>
                    </tr>
                  ))}
                  {!educators.length ? <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-[#8a8881]">No educators have accepted an invitation yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="institution-panel overflow-hidden">
            <div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Pending invitations</h2><p className="mt-1 text-xs text-[#8a8881]">Resend or revoke access before an invitation is accepted.</p></div>
            <div className="divide-y divide-[#efede7]">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-semibold text-[#252521]">{invite.email}</p><p className="mt-1 text-xs text-[#8a8881]">{invite.courseName || "Workspace invitation"} · {invite.expired ? "Expired" : `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}</p>{invite.deliveryError ? <p className="mt-1 text-xs font-medium text-[#b42318]">{invite.deliveryError}</p> : null}</div>
                  <div className="flex gap-2">
                    <form action={resendAction}><input type="hidden" name="invite_id" value={invite.id} /><button className="institution-button-secondary h-9 px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Resend</button></form>
                    <form action={revokeAction}><input type="hidden" name="invite_id" value={invite.id} /><button className="inline-flex h-9 items-center gap-1 rounded-[9px] border border-[#f0c4bd] bg-[#fff5f3] px-3 text-xs font-semibold text-[#b42318]"><XCircle className="h-3.5 w-3.5" /> Revoke</button></form>
                  </div>
                </div>
              ))}
              {!pendingInvites.length ? <p className="px-5 py-9 text-center text-sm text-[#8a8881]">No pending educator invitations.</p> : null}
            </div>
          </div>
        </div>

        <aside className="institution-panel h-fit p-5 xl:sticky xl:top-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eef3ff] text-[#0066ff]"><UserRoundPlus className="h-5 w-5" /></div>
          <h2 className="mt-4 text-lg font-semibold text-[#0e0f12]">Invite an educator</h2>
          <p className="mt-1 text-xs leading-5 text-[#77746d]">They will receive a secure seven-day activation link and enter directly into the selected class.</p>
          <form action={inviteEducatorAction} className="mt-5 space-y-4">
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Full name</span><input name="name" required className="institution-input" placeholder="Dr. Avery Carter" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Work email</span><input name="email" type="email" required className="institution-input" placeholder="avery@university.edu" /></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Class</span><select name="course_id" required className="institution-input"><option value="">Choose a class</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            <button className="institution-button-primary w-full"><MailPlus className="h-4 w-4" /> Send invitation</button>
          </form>
        </aside>
      </section>
    </main>
  )
}
