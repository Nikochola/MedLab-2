export default function Loading() {
  return (
    <div className="admin-canvas">
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="rounded-2xl border border-border bg-white/70 p-5 space-y-4">
          <div className="h-3 w-24 rounded bg-slate-200/80" />
          <div className="h-8 w-40 rounded bg-slate-200/80" />
          <div className="h-4 w-72 rounded bg-slate-200/60" />
          <div className="h-10 w-full rounded-xl bg-slate-200/60" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white/70 p-5 space-y-3">
              <div className="h-4 w-32 rounded bg-slate-200/70" />
              <div className="h-10 w-full rounded-xl bg-slate-200/60" />
              <div className="h-10 w-full rounded-xl bg-slate-200/60" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-5 space-y-4">
          <div className="h-4 w-36 rounded bg-slate-200/70" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-200/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
