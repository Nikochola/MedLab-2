export default function Loading() {
  return (
    <div className="admin-canvas">
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="rounded-2xl border border-border bg-white/70 p-5 space-y-4">
          <div className="h-3 w-24 rounded bg-slate-200/80" />
          <div className="h-8 w-72 rounded bg-slate-200/80" />
          <div className="h-4 w-96 rounded bg-slate-200/60" />
          <div className="h-10 w-full rounded-xl bg-slate-200/60" />
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-200/70" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-200/60" />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-6 space-y-4">
          <div className="h-5 w-52 rounded bg-slate-200/70" />
          <div className="h-40 rounded-xl bg-slate-200/60" />
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-6 space-y-4">
          <div className="h-5 w-44 rounded bg-slate-200/70" />
          <div className="h-64 rounded-xl bg-slate-200/60" />
        </div>
      </div>
    </div>
  )
}
