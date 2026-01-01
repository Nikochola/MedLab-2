"use client"

import { motion } from "framer-motion"

export function ECGPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/70 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur"
    >
      <div className="grid min-h-[440px] grid-cols-[220px_1fr]">
        <div className="border-r border-slate-200/80 bg-slate-50/80 p-5">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-slate-200/80" />
            <div>
              <div className="h-2.5 w-24 rounded-full bg-slate-200" />
              <div className="mt-1 h-2 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2">
                <div className="h-8 w-8 rounded-xl bg-slate-200/80" />
                <div className="h-3 w-24 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="relative p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="mt-2 h-5 w-40 rounded-full bg-slate-300" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-full bg-slate-200" />
              <div className="h-8 w-16 rounded-full bg-slate-200" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 p-6 shadow-sm">
              <div className="absolute inset-0 opacity-60" aria-hidden>
                <div className="h-full w-full bg-[linear-gradient(transparent_94%,rgba(248,113,113,0.35)_94%),linear-gradient(90deg,transparent_94%,rgba(248,113,113,0.35)_94%)] bg-[length:22px_22px]" />
              </div>
              <div className="relative">
                <div className="mb-4 h-3 w-32 rounded-full bg-rose-200" />
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-xl bg-white/80 shadow-sm" />
                  ))}
                </div>
                <div className="mt-6 h-28 rounded-2xl border border-rose-200 bg-white/80" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  <div className="h-2.5 w-5/6 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                <div className="h-3 w-28 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  <div className="h-2.5 w-4/6 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  <div className="h-2.5 w-3/5 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-6 top-6 rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-xs font-semibold text-rose-500">
        ECG Workbench Preview
      </div>
    </motion.div>
  )
}
