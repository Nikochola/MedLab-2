import { Download, FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react"

import { getStarterAnalytics, requireStarterPortalContext } from "@/server/institution"

export default async function InstitutionReportsPage() {
  const { context } = await requireStarterPortalContext("/institution/reports")
  const analytics = await getStarterAnalytics(context)

  return (
    <main>
      <header className="institution-page-header"><div><p className="institution-eyebrow">Exports</p><h1 className="institution-title">Reports</h1><p className="institution-subtitle">Download clean performance records for faculty review, intervention planning, and institutional reporting.</p></div></header>
      <section className="grid gap-5 md:grid-cols-2">
        <article className="institution-panel p-5"><div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-[#eef3ff] text-[#0066ff]"><FileSpreadsheet className="h-5 w-5" /></div><h2 className="mt-5 text-lg font-semibold text-[#0e0f12]">Student progress summary</h2><p className="mt-2 text-sm leading-6 text-[#6b6a65]">One row per student, including learners with no activity, assignment completion, average score, and last active time.</p><a href="/api/institution/reports/performance?view=students" className="institution-button-primary mt-6 w-full"><Download className="h-4 w-4" /> Download student CSV</a></article>
        <article className="institution-panel p-5"><div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-[#f0eee8] text-[#4f4d47]"><FileDown className="h-5 w-5" /></div><h2 className="mt-5 text-lg font-semibold text-[#0e0f12]">Attempt detail</h2><p className="mt-2 text-sm leading-6 text-[#6b6a65]">One row per attempt with readable case names, modality, score, duration, assignment, source, and completion timestamp.</p><a href="/api/institution/reports/performance?view=attempts" className="institution-button-secondary mt-6 w-full"><Download className="h-4 w-4" /> Download attempt CSV</a></article>
      </section>
      {analytics.courses.length ? <section className="institution-panel mt-6 overflow-hidden"><div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Class-specific exports</h2><p className="mt-1 text-xs text-[#8a8881]">Use the same two report formats for an individual class.</p></div><div className="divide-y divide-[#efede7]">{analytics.courses.map((course) => <div key={course.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#252521]">{course.name}</p><p className="mt-0.5 text-xs text-[#8a8881]">{course.studentCount} students</p></div><div className="flex flex-wrap gap-2"><a href={`/api/institution/reports/performance?view=students&courseId=${course.id}`} className="institution-button-secondary"><Download className="h-4 w-4" /> Students</a><a href={`/api/institution/reports/performance?view=attempts&courseId=${course.id}`} className="institution-button-secondary"><Download className="h-4 w-4" /> Attempts</a></div></div>)}</div></section> : null}
      <div className="mt-6 flex items-start gap-3 rounded-[12px] border border-[#cfe2d2] bg-[#f3faf4] px-4 py-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#24713a]" /><div><p className="text-sm font-semibold text-[#245b32]">Role-aware exports</p><p className="mt-1 text-xs leading-5 text-[#4f7658]">Administrators export institution-wide records. Educator exports include only accessible classes and their assigned students.</p></div></div>
    </main>
  )
}
