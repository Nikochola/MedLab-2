import Link from "next/link"
import { ArrowRight, BarChart3, ClipboardList, Clock3, GraduationCap, UserRoundCheck, UsersRound } from "lucide-react"

import { getStarterOverview, requireStarterPortalContext } from "@/server/institution"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export default async function InstitutionOverviewPage() {
  const { context } = await requireStarterPortalContext("/institution/overview")
  const overview = await getStarterOverview(context)
  const firstName = context.membership.role === "INSTITUTION_ADMIN" ? "Administrator" : "Educator"

  const stats = [
    { label: "Active students", value: overview.studentCount, detail: "Across your visible classes", icon: UsersRound },
    { label: "Educators", value: overview.educatorCount, detail: "Active teaching staff", icon: UserRoundCheck },
    { label: "Attempts · 30 days", value: overview.totalAttempts, detail: "Completed case activity", icon: BarChart3 },
    { label: "Average score", value: overview.averageScore === null ? "—" : `${overview.averageScore}%`, detail: "Scored attempts", icon: GraduationCap }
  ]

  return (
    <main>
      <header className="institution-page-header">
        <div>
          <p className="institution-eyebrow">{String(context.institution.billing_plan || "Starter").toLowerCase().replace(/^./, (letter) => letter.toUpperCase())} workspace</p>
          <h1 className="institution-title">Good to see you, {firstName}.</h1>
          <p className="institution-subtitle">
            A concise view of class activity, assignments, and the students who may need attention.
          </p>
        </div>
        <Link href="/institution/assignments" className="institution-button-primary">
          <ClipboardList className="h-4 w-4" /> Create assignment
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="institution-stat-card">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77746d]">{stat.label}</p>
                <Icon className="h-4 w-4 text-[#0066ff]" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#0e0f12]">{stat.value}</p>
              <p className="mt-1 text-xs text-[#8a8881]">{stat.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="institution-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e8e6df] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0e0f12]">Recent student activity</h2>
              <p className="mt-1 text-xs text-[#8a8881]">Latest case attempts visible to you</p>
            </div>
            <Link href="/institution/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066ff]">
              Full analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {overview.recentAttempts.length ? (
            <div className="divide-y divide-[#efede7]">
              {overview.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="grid items-center gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_140px_100px]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#252521]">{attempt.studentName || "Student"}</p>
                    <p className="mt-0.5 truncate text-xs text-[#8a8881]">{attempt.caseTitle}</p>
                  </div>
                  <p className="text-xs text-[#696761]">{formatDate(attempt.createdAt)}</p>
                  <p className="text-right text-sm font-semibold text-[#0e0f12]">{attempt.score === null ? "Completed" : `${attempt.score}%`}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Clock3 className="mx-auto h-6 w-6 text-[#aaa79f]" />
              <p className="mt-3 text-sm font-semibold text-[#4f4d47]">No recorded attempts yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8a8881]">Assigned case submissions will appear here automatically.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="institution-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0e0f12]">Rollout status</h2>
              <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0047cc]">Starter</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Classes configured", value: overview.courses.length },
                { label: "Published assignments", value: overview.activeAssignments },
                { label: "Pending invitations", value: overview.pendingInvites }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[10px] bg-[#f5f3ed] px-3.5 py-3">
                  <span className="text-xs font-medium text-[#65635d]">{item.label}</span>
                  <span className="text-sm font-semibold text-[#0e0f12]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="institution-panel p-5">
            <h2 className="text-base font-semibold text-[#0e0f12]">Classes</h2>
            <div className="mt-4 space-y-2">
              {overview.courses.slice(0, 4).map((course) => (
                <Link key={course.id} href={`/institution/students?courseId=${course.id}`} className="flex items-center justify-between rounded-[10px] border border-[#e4e1d9] bg-white px-3.5 py-3 transition hover:border-[#b9cfff]">
                  <div>
                    <p className="text-sm font-semibold text-[#252521]">{course.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#8a8881]">{course.studentCount} students · {course.educatorCount} educators</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#77746d]" />
                </Link>
              ))}
              {!overview.courses.length ? <p className="py-5 text-center text-xs text-[#8a8881]">No classes available.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
