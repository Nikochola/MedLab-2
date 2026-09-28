import { Activity, BarChart3, Clock3, Target, TrendingDown, UsersRound } from "lucide-react"

import { getStarterAnalytics, listStarterCourses, requireStarterPortalContext } from "@/server/institution"

export default async function InstitutionAnalyticsPage({ searchParams }: { searchParams?: { courseId?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/analytics")
  const [analytics, courses] = await Promise.all([
    getStarterAnalytics(context, searchParams?.courseId),
    listStarterCourses(context)
  ])
  const scored = analytics.attempts.filter((attempt) => attempt.score !== null)
  const averageScore = scored.length ? Number((scored.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scored.length).toFixed(1)) : null
  const averageDuration = analytics.attempts.filter((attempt) => attempt.durationSec !== null)
  const durationSeconds = averageDuration.length ? Math.round(averageDuration.reduce((sum, attempt) => sum + Number(attempt.durationSec), 0) / averageDuration.length) : null
  const assigned = analytics.students.reduce((sum, student) => sum + student.assignmentsAssigned, 0)
  const completed = analytics.students.reduce((sum, student) => sum + student.assignmentsCompleted, 0)
  const assignmentCompletion = assigned ? Number(((completed / assigned) * 100).toFixed(1)) : null
  const daily = analytics.daily.slice(-14)
  const maxAttempts = Math.max(1, ...daily.map((item) => item.attempts))

  return (
    <main>
      <header className="institution-page-header"><div><p className="institution-eyebrow">Performance</p><h1 className="institution-title">Analytics</h1><p className="institution-subtitle">Class activity, student performance, and weak cases in one educator-ready view.</p></div>{courses.length > 1 || searchParams?.courseId ? <form method="get" className="flex items-center gap-2"><select name="courseId" defaultValue={searchParams?.courseId || ""} className="institution-input h-10 min-w-[200px]"><option value="">All classes</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><button className="institution-button-secondary h-10">Filter</button></form> : null}</header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[{ label: "Visible students", value: analytics.students.length, icon: UsersRound }, { label: "Total attempts", value: analytics.attempts.length, icon: Activity }, { label: "Assignments done", value: assignmentCompletion === null ? "—" : `${assignmentCompletion}%`, icon: Target }, { label: "Practice score", value: averageScore === null ? "—" : `${averageScore}%`, icon: Target }, { label: "Average time", value: durationSeconds === null ? "—" : `${Math.max(1, Math.round(durationSeconds / 60))} min`, icon: Clock3 }].map((stat) => { const Icon = stat.icon; return <article key={stat.label} className="institution-stat-card"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77746d]">{stat.label}</p><Icon className="h-4 w-4 text-[#0066ff]" /></div><p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#0e0f12]">{stat.value}</p></article> })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <div className="institution-panel p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[#0e0f12]">Attempt activity</h2><p className="mt-1 text-xs text-[#8a8881]">Last 14 active days</p></div><BarChart3 className="h-5 w-5 text-[#0066ff]" /></div>
          {daily.length ? <div className="mt-7 flex h-52 items-end gap-2 border-b border-[#d8d5cc] px-1">{daily.map((item) => <div key={item.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"><div className="relative w-full max-w-8 rounded-t-[5px] bg-[#b9ceff] transition group-hover:bg-[#0066ff]" style={{ height: `${Math.max(8, Math.round((item.attempts / maxAttempts) * 100))}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#65635d]">{item.attempts}</span></div><span className="mt-2 hidden text-[9px] text-[#8a8881] sm:block">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div>)}</div> : <div className="py-20 text-center text-sm text-[#8a8881]">No attempts have been recorded yet.</div>}
        </div>

        <div className="institution-panel p-5">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-[#d97706]" /><h2 className="text-base font-semibold text-[#0e0f12]">Cases needing attention</h2></div>
          <div className="mt-5 space-y-3">{analytics.weakestCases.map((item, index) => <div key={item.caseId} className="rounded-[10px] border border-[#e4e1d9] bg-white p-3.5"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-[#353431]">{item.caseTitle}</p><span className="text-xs font-bold text-[#b45309]">{item.averageScore === null ? "—" : `${item.averageScore}%`}</span></div><p className="mt-1 text-[11px] text-[#8a8881]">{item.modality || "Practice"} · {item.attempts} attempt{item.attempts === 1 ? "" : "s"} · Priority {index + 1}</p></div>)}{!analytics.weakestCases.length ? <p className="py-12 text-center text-sm text-[#8a8881]">Weak-case analysis will appear after scored submissions.</p> : null}</div>
        </div>
      </section>

      <section className="institution-panel mt-6 overflow-hidden">
        <div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Student progress</h2><p className="mt-1 text-xs text-[#8a8881]">Use this list to identify inactivity and low practice scores before assessment deadlines.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-[#f5f3ed] text-[10px] uppercase tracking-[0.12em] text-[#77746d]"><tr><th className="px-5 py-3 font-semibold">Student</th><th className="px-4 py-3 font-semibold">Assignments</th><th className="px-4 py-3 font-semibold">Attempts</th><th className="px-4 py-3 font-semibold">Average score</th><th className="px-5 py-3 font-semibold">Last active</th></tr></thead><tbody className="divide-y divide-[#efede7]">{analytics.students.map((student) => <tr key={student.studentId}><td className="px-5 py-4"><p className="font-semibold text-[#252521]">{student.name}</p><p className="mt-0.5 text-xs text-[#8a8881]">{student.email}</p></td><td className="px-4 py-4"><p className="font-semibold text-[#353431]">{student.assignmentsCompleted}/{student.assignmentsAssigned}</p><p className="mt-0.5 text-[11px] text-[#8a8881]">{student.assignmentCompletion === null ? "None assigned" : `${student.assignmentCompletion}% complete`}</p></td><td className="px-4 py-4 font-semibold text-[#353431]">{student.attempts}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.averageScore === null ? "bg-[#f0eee8] text-[#77746d]" : student.averageScore < 70 ? "bg-[#fff3e3] text-[#a15c00]" : "bg-[#edf8ef] text-[#24713a]"}`}>{student.averageScore === null ? "Not scored" : `${student.averageScore}%`}</span></td><td className="px-5 py-4 text-xs text-[#77746d]">{student.lastActive ? new Date(student.lastActive).toLocaleString() : "No activity yet"}</td></tr>)}{!analytics.students.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#8a8881]">No students in this class yet.</td></tr> : null}</tbody></table></div>
      </section>
    </main>
  )
}
