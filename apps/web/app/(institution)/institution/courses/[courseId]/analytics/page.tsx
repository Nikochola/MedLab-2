import { notFound, redirect } from "next/navigation"

import { getSessionWithRole } from "@/server/auth/session"
import {
  getCourseAnalytics,
  getCourseById,
  requireInstitutionRole,
  userCanAccessCourse
} from "@/server/institution"

interface AnalyticsPageProps {
  params: { courseId: string }
}

export default async function CourseAnalyticsPage({ params }: AnalyticsPageProps) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect(`/login?next=/institution/courses/${params.courseId}/analytics`)
  }
  const ensuredSession = sessionWithRole

  const context = await requireInstitutionRole(ensuredSession.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])

  const course = await getCourseById(params.courseId)

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

  const analytics = await getCourseAnalytics(ensuredCourse.id)

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active students</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.activeStudents}</p>
        </article>
        <article className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total attempts</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.totalAttempts}</p>
        </article>
        <article className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Average score</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.averageScore ?? "—"}</p>
        </article>
      </section>

      {analytics.hasAttempts ? (
        <>
          <section className="surface-card p-5">
            <h2 className="text-lg font-semibold text-slate-900">Trend data (JSON)</h2>
            <p className="mt-1 text-sm text-slate-600">Use this payload for chart rendering in the next iteration.</p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
              {JSON.stringify(analytics.trend, null, 2)}
            </pre>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-lg font-semibold text-slate-900">Weakest cases/topics</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Attempts</th>
                    <th className="px-3 py-2 font-semibold">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.weakestCases.map((item) => (
                    <tr key={item.caseId} className="border-t border-border">
                      <td className="px-3 py-2">{item.caseId}</td>
                      <td className="px-3 py-2">{item.attempts}</td>
                      <td className="px-3 py-2">{item.averageScore ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="surface-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">No analytics data yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            The analytics view uses `case_attempts`. Once attempts are recorded for this course, trend and weakest-case data will populate automatically.
          </p>
        </section>
      )}
    </div>
  )
}
