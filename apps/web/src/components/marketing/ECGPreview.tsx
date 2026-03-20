"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export const previewZones = [
  {
    id: "library",
    title: "Case library",
    description: "Browse curated ECG cases and track progress.",
    callout: "right-6 top-6",
  },
  {
    id: "workbench",
    title: "ECG workbench",
    description: "Read, annotate, and compare waveforms in one place.",
    callout: "right-6 bottom-6",
  },
  {
    id: "insights",
    title: "Clinical notes",
    description: "Review prompts, reasoning, and next-step guidance.",
    callout: "left-6 top-6",
  },
] as const

export type PreviewZone = (typeof previewZones)[number]["id"]

type ECGPreviewProps = {
  activeZone?: PreviewZone | null
  onZoneChange?: (zone: PreviewZone) => void
}

export function ECGPreview({ activeZone, onZoneChange }: ECGPreviewProps) {
  const activeMeta = previewZones.find((zone) => zone.id === activeZone)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/70 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur"
    >
      <div className="grid min-h-[440px] grid-cols-[220px_1fr]">
        <div
          onMouseEnter={() => onZoneChange?.("library")}
          className={cn(
            "border-r border-slate-200/80 bg-slate-50/80 p-5 transition",
            activeZone === "library" && "bg-white ring-2 ring-blue-200/70 shadow-sm"
          )}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-200 to-indigo-200 shadow-sm" />
            <div>
              <div className="h-2.5 w-24 rounded-full bg-slate-300" />
              <div className="mt-1 h-2 w-16 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            <div className="h-2.5 w-20 rounded-full bg-slate-200" />
            <div className="h-2.5 w-10 rounded-full bg-slate-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.35)]"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100" />
                <div className="flex-1">
                  <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-14 rounded-full bg-slate-100" />
                </div>
                <div className="h-2 w-2 rounded-full bg-blue-400/70" />
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
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 rounded-full bg-slate-200" />
              <div className="h-8 w-16 rounded-full bg-slate-200" />
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-100" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              onMouseEnter={() => onZoneChange?.("workbench")}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 p-6 shadow-sm transition",
                activeZone === "workbench" && "ring-2 ring-rose-300/70 shadow-md"
              )}
            >
              <div className="absolute inset-0 opacity-60" aria-hidden>
                <div className="h-full w-full bg-[linear-gradient(transparent_94%,rgba(248,113,113,0.35)_94%),linear-gradient(90deg,transparent_94%,rgba(248,113,113,0.35)_94%)] bg-[length:22px_22px]" />
              </div>
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2.5 w-20 rounded-full bg-rose-200" />
                  <div className="h-2 w-10 rounded-full bg-rose-100" />
                </div>
                <div className="mb-4 h-10 rounded-2xl bg-white/80 shadow-sm" />
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-xl bg-white/80 shadow-sm" />
                  ))}
                </div>
                <div className="mt-6 h-28 rounded-2xl border border-rose-200 bg-white/80" />
                <div className="mt-4 h-6 rounded-full bg-gradient-to-r from-rose-200 via-rose-100 to-transparent" />
              </div>
            </div>

            <div
              onMouseEnter={() => onZoneChange?.("insights")}
              className={cn(
                "space-y-4 rounded-2xl border border-transparent p-3 transition",
                activeZone === "insights" && "border-slate-200/80 bg-white/70 ring-2 ring-blue-200/60"
              )}
            >
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)]">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  <div className="h-2.5 w-5/6 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)]">
                <div className="h-3 w-28 rounded-full bg-slate-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100" />
                  <div className="h-2.5 w-4/6 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)]">
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

      {activeMeta ? (
        <div
          className={cn(
            "absolute rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left text-xs shadow-lg shadow-slate-200/50",
            activeMeta.callout
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Active area
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{activeMeta.title}</p>
          <p className="mt-1 text-xs text-slate-500">{activeMeta.description}</p>
        </div>
      ) : (
        <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500">
          Hover to explore
        </div>
      )}
    </motion.div>
  )
}
