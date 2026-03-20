import Link from "next/link"
import { buildStudentAppUrl } from "../lib/runtimeUrls"

export default function StudentsPage() {
  return (
    <main className="marketing-shell py-10">
      <section className="panel p-8">
        <h1 className="text-3xl font-black text-slate-900">For Students</h1>
        <p className="text-muted mt-3 max-w-3xl text-sm">
          Practice high-yield ECG and chest X-ray interpretation in guided sessions. Track your progress over time and build confidence for clinical exams and rotations.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Structured ECG and X-ray practice workflows</li>
          <li>Progress tracking with streak and XP metrics</li>
          <li>Invite-based enrollment into institution courses</li>
        </ul>
        <Link href={buildStudentAppUrl("/student/login")} className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Start Practicing
        </Link>
      </section>
    </main>
  )
}
