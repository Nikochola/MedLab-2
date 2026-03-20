import Link from "next/link"
import { buildInstitutionUrl } from "../lib/runtimeUrls"

export default function EducatorsPage() {
  return (
    <main className="marketing-shell py-10">
      <section className="panel p-8">
        <h1 className="text-3xl font-black text-slate-900">For Educators</h1>
        <p className="text-muted mt-3 max-w-3xl text-sm">
          Assign practical work, monitor learner activity, and keep cohorts aligned through centralized course tools.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Educator membership per course</li>
          <li>Student and educator roster workflows</li>
          <li>Simple analytics for attempts and performance</li>
        </ul>
        <Link href={buildInstitutionUrl("/institution/login")} className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Educator Login
        </Link>
      </section>
    </main>
  )
}
