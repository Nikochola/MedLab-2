import Link from "next/link"

export default function InstitutionSchedulePage() {
  const calBookingUrl = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || "https://www.cal.eu/medlab"

  return (
    <main className="marketing-shell py-10">
      <section className="panel mx-auto max-w-3xl space-y-6 p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Request Submitted</p>
        <h1 className="text-3xl font-black text-slate-900">Schedule your MedLab intro meeting</h1>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600">
          Your institution access request is in review. If you want to accelerate rollout planning, choose a meeting time with the MedLab team.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={calBookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-slate-800"
          >
            Open Scheduler
          </a>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-50"
          >
            Back To Home
          </Link>
        </div>
      </section>
    </main>
  )
}
