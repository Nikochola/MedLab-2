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

        <div className="rounded-2xl border border-border bg-white/70 p-5 space-y-3">
          <div className="h-4 w-32 rounded bg-slate-200/70" />
          <div className="h-12 w-full rounded-xl bg-slate-200/60" />
          <div className="h-12 w-full rounded-xl bg-slate-200/60" />
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-4 space-y-3">
          <div className="h-4 w-40 rounded bg-slate-200/70" />
          <div className="h-10 w-full rounded-xl bg-slate-200/60" />
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-4">
          <div className="h-10 w-full rounded-xl bg-slate-200/60" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-200/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
