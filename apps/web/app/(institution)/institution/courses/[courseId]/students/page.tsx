import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"

import { getSessionWithRole } from "@/server/auth/session"
import {
  getCourseById,
  inviteMembers,
  listMembers,
  parseCsvRows,
  removeMember,
  requireInstitutionRole,
  userCanAccessCourse,
  type InviteSummary
} from "@/server/institution"

interface StudentsPageProps {
  params: { courseId: string }
  searchParams?: { result?: string }
}

function getField(row: Record<string, string>, candidates: string[]) {
  const entries = Object.entries(row)
  for (const candidate of candidates) {
    const found = entries.find(([key]) => key.trim().toLowerCase() === candidate.toLowerCase())
    if (found) {
      return String(found[1] || "").trim()
    }
  }

  return ""
}

function compactSummary(summary: InviteSummary) {
  return {
    ...summary,
    results: summary.results.slice(0, 40)
  }
}

function encodeSummary(summary: InviteSummary) {
  return encodeURIComponent(JSON.stringify(compactSummary(summary)))
}

function decodeSummary(value?: string) {
  if (!value) return null

  try {
    return JSON.parse(decodeURIComponent(value)) as InviteSummary
  } catch {
    return null
  }
}

async function loadCourseContext(courseId: string) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect(`/login?next=/institution/courses/${courseId}/students`)
  }
  const ensuredSession = sessionWithRole

  const context = await requireInstitutionRole(ensuredSession.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])

  const course = await getCourseById(courseId)

  if (!course || course.institution_id !== context.institution.id) {
    notFound()
  }
  const ensuredCourse = course

  const canAccess = await userCanAccessCourse({
    courseId: ensuredCourse.id,
    userId: ensuredSession.session.user.id,
    institutionRole: context.membership.role
  })

  if (!canAccess) {
    redirect("/institution/courses")
  }

  return {
    sessionWithRole: ensuredSession,
    context,
    course: ensuredCourse,
    canManage: context.membership.role === "INSTITUTION_ADMIN"
  }
}

export default async function CourseStudentsPage({ params, searchParams }: StudentsPageProps) {
  const context = await loadCourseContext(params.courseId)
  const students = await listMembers({ courseId: context.course.id, role: "STUDENT" })
  const summary = decodeSummary(searchParams?.result)

  async function inviteStudentAction(formData: FormData) {
    "use server"

    const courseId = String(formData.get("course_id") || "")
    const pageContext = await loadCourseContext(courseId)

    if (!pageContext.canManage) {
      throw new Error("Only institution admins can invite students")
    }

    const email = String(formData.get("email") || "")
    const name = String(formData.get("student_name") || "") || null
    const educatorName = String(formData.get("educator_name") || "") || null
    const educatorEmail = String(formData.get("educator_email") || "") || null

    const summary = await inviteMembers({
      institutionId: pageContext.context.institution.id,
      courseId,
      invitedByUserId: pageContext.sessionWithRole.session.user.id,
      role: "STUDENT",
      rows: [
        {
          email,
          name,
          metadata: {
            student_name: name,
            educator_name: educatorName,
            educator_email: educatorEmail
          }
        }
      ]
    })

    revalidatePath(`/institution/courses/${courseId}/students`)
    redirect(`/institution/courses/${courseId}/students?result=${encodeSummary(summary)}`)
  }

  async function inviteStudentCsvAction(formData: FormData) {
    "use server"

    const courseId = String(formData.get("course_id") || "")
    const pageContext = await loadCourseContext(courseId)

    if (!pageContext.canManage) {
      throw new Error("Only institution admins can invite students")
    }

    const csvFile = formData.get("csv_file")
    const csvText = String(formData.get("csv_text") || "")
    const rawCsv = csvFile instanceof File ? await csvFile.text() : csvText

    if (!rawCsv.trim()) {
      const emptySummary: InviteSummary = {
        role: "STUDENT",
        total_rows: 0,
        invited_count: 0,
        skipped_count: 0,
        error_count: 1,
        results: [{ email: "(none)", status: "ERROR", reason: "No CSV content provided" }]
      }
      redirect(`/institution/courses/${courseId}/students?result=${encodeSummary(emptySummary)}`)
    }

    let rows: Record<string, string>[] = []

    try {
      rows = parseCsvRows(rawCsv)
    } catch (error) {
      const parseSummary: InviteSummary = {
        role: "STUDENT",
        total_rows: 0,
        invited_count: 0,
        skipped_count: 0,
        error_count: 1,
        results: [
          {
            email: "(invalid file)",
            status: "ERROR",
            reason: error instanceof Error ? error.message : "CSV parsing failed"
          }
        ]
      }
      redirect(`/institution/courses/${courseId}/students?result=${encodeSummary(parseSummary)}`)
    }

    const inviteRows = rows.map((row) => {
      const email = getField(row, ["student_email", "email"])
      const studentName = getField(row, ["student_name", "name"])
      const educatorName = getField(row, ["educator_name"])
      const educatorEmail = getField(row, ["educator_email"])

      return {
        email,
        name: studentName || null,
        metadata: {
          student_name: studentName || null,
          educator_name: educatorName || null,
          educator_email: educatorEmail || null
        }
      }
    })

    const summary = await inviteMembers({
      institutionId: pageContext.context.institution.id,
      courseId,
      invitedByUserId: pageContext.sessionWithRole.session.user.id,
      role: "STUDENT",
      rows: inviteRows
    })

    revalidatePath(`/institution/courses/${courseId}/students`)
    redirect(`/institution/courses/${courseId}/students?result=${encodeSummary(summary)}`)
  }

  async function dropStudentAction(formData: FormData) {
    "use server"

    const courseId = String(formData.get("course_id") || "")
    const userId = String(formData.get("user_id") || "")

    const pageContext = await loadCourseContext(courseId)

    if (!pageContext.canManage) {
      throw new Error("Only institution admins can remove students")
    }

    await removeMember({
      courseId,
      userId,
      role: "STUDENT"
    })

    revalidatePath(`/institution/courses/${courseId}/students`)
    redirect(`/institution/courses/${courseId}/students`)
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-6">
        <h2 className="text-xl font-semibold text-slate-900">Students</h2>
        <p className="mt-1 text-sm text-slate-600">Invite, import, and manage students enrolled in this course.</p>
      </section>

      {summary ? (
        <section className="surface-card p-6">
          <h3 className="text-lg font-semibold">Invite Summary</h3>
          <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
            <p>Total rows: {summary.total_rows}</p>
            <p>Invited: {summary.invited_count}</p>
            <p>Skipped: {summary.skipped_count}</p>
            <p>Errors: {summary.error_count}</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((row, index) => (
                  <tr key={`${row.email}-${index}`} className="border-t border-border">
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {context.canManage ? (
        <section className="surface-card space-y-6 p-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Invite Students (Manual)</h3>
            <form action={inviteStudentAction} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="course_id" value={context.course.id} />
              <input name="email" type="email" required placeholder="student_email" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
              <input name="student_name" placeholder="student_name (optional)" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
              <input name="educator_name" placeholder="educator_name (optional)" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
              <input name="educator_email" placeholder="educator_email (optional)" className="rounded-md border border-input bg-white px-3 py-2 text-sm" />
              <div className="md:col-span-4">
                <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
                  Invite Student
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Upload CSV</h3>
              <a
                href={`/api/institution/courses/${context.course.id}/template?role=student`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Download CSV Template
              </a>
            </div>
            <form action={inviteStudentCsvAction} className="space-y-3">
              <input type="hidden" name="course_id" value={context.course.id} />
              <input type="file" name="csv_file" accept=".csv,text/csv" className="block w-full text-sm" />
              <textarea
                name="csv_text"
                rows={5}
                placeholder="Optional: paste CSV content"
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              />
              <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
                Upload CSV
              </button>
            </form>
            <p className="text-xs text-slate-500">
              Supported columns: student_email or email (required), student_name (optional), educator_name (optional), educator_email (optional).
            </p>
          </div>
        </section>
      ) : (
        <section className="surface-card p-6 text-sm text-slate-600">
          You can view the roster, but invite and removal actions are restricted to institution admins.
        </section>
      )}

      <section className="surface-card p-6">
        <h3 className="text-lg font-semibold">Roster</h3>
        <div className="mt-3 overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.membership_id} className="border-t border-border">
                  <td className="px-3 py-2">{student.name || "—"}</td>
                  <td className="px-3 py-2">{student.email}</td>
                  <td className="px-3 py-2">{student.status}</td>
                  <td className="px-3 py-2">
                    {context.canManage ? (
                      <form action={dropStudentAction}>
                        <input type="hidden" name="course_id" value={context.course.id} />
                        <input type="hidden" name="user_id" value={student.user_id} />
                        <button type="submit" className="text-sm font-semibold text-red-600 hover:underline">
                          Drop
                        </button>
                      </form>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!students.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                    No students enrolled yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
