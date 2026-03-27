"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Play, ClipboardList } from "lucide-react"
import { getTrackById } from "@/lib/tracks/trackData"
import type { TrackUnit } from "@/lib/tracks/trackData"

// Tile color based on type + difficulty — light → bold as you progress
function tileTheme(unit: TrackUnit) {
  const isSim = unit.type === "simulation"

  if (isSim) {
    if (unit.difficulty === "Beginner") return { bg: "#EEF3FF", icon: "#0066FF", text: "#0E0F12", sub: "#6B7FCC", border: "#C7D9FF" }
    if (unit.difficulty === "Intermediate") return { bg: "#CCE0FF", icon: "#0047CC", text: "#0E0F12", sub: "#0047CC", border: "#99C2FF" }
    return { bg: "#0066FF", icon: "#ffffff", text: "#ffffff", sub: "rgba(255,255,255,0.7)", border: "#0047CC" }
  } else {
    if (unit.difficulty === "Beginner") return { bg: "#F5F5F3", icon: "#6B6A65", text: "#0E0F12", sub: "#9B9A94", border: "#E8E6DF" }
    if (unit.difficulty === "Intermediate") return { bg: "#E0DDD6", icon: "#3D3C38", text: "#0E0F12", sub: "#6B6A65", border: "#C8C5BC" }
    return { bg: "#0E0F12", icon: "#ffffff", text: "#ffffff", sub: "rgba(255,255,255,0.55)", border: "#2a2b2e" }
  }
}

function UnitTile({ unit, trackId }: { unit: TrackUnit; trackId: string }) {
  const t = tileTheme(unit)
  const isCase = unit.type === "case"
  const href = `/learn/${trackId}/${unit.id}`
  const isComingSoon = unit.id === "ecg-u10"

  if (isComingSoon) {
    return (
      <div
        className="relative flex flex-col justify-between rounded-[16px] p-5 overflow-hidden"
        style={{
          backgroundColor: t.bg,
          border: `1.5px solid ${t.border}`,
          minHeight: 160,
        }}
      >


        {/* Top row: icon + unit number */}
        <div className="flex items-start justify-between relative z-10">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <ClipboardList className="h-5 w-5" style={{ color: t.icon }} />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: t.sub }}>
            {String(unit.number).padStart(2, "0")}
          </span>
        </div>

        {/* Bottom: title + type */}
        <div className="mt-4 relative z-10 flex flex-col justify-end">
          <img src="/images/chartview.svg" alt="ChartView Logo" className="h-4 w-auto object-contain object-left mb-3 self-start" />
          <p className="flex items-center text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: t.sub }}>
            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)", color: t.icon }}>COMING SOON</span>
          </p>
          <p className="mt-1 text-sm font-bold leading-snug" style={{ color: t.text }}>
            {unit.title}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-[16px] p-5 transition-all"
      style={{
        backgroundColor: t.bg,
        border: `1.5px solid ${t.border}`,
        minHeight: 160,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Top row: icon + unit number */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        >
          {isCase
            ? <ClipboardList className="h-5 w-5" style={{ color: t.icon }} />
            : <Play className="h-5 w-5" style={{ color: t.icon }} />
          }
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: t.sub }}
        >
          {String(unit.number).padStart(2, "0")}
        </span>
      </div>

      {/* Bottom: title + type */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: t.sub }}>
          {isCase ? "Case" : "Simulation"}
        </p>
        <p className="mt-0.5 text-sm font-bold leading-snug" style={{ color: t.text }}>
          {unit.title}
        </p>
      </div>
    </Link>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px" style={{ backgroundColor: "#E8E6DF" }} />
      <p className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "#C8C5BC" }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ backgroundColor: "#E8E6DF" }} />
    </div>
  )
}

export default function TrackPage() {
  const params = useParams()
  const trackId = params?.trackId as string
  const track = getTrackById(trackId)

  if (!track) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>Track not found</p>
          <Link href="/learn" className="mt-2 block text-sm" style={{ color: "#0066FF" }}>← Back to Learn</Link>
        </div>
      </div>
    )
  }

  const beginner = track.units.filter(u => u.difficulty === "Beginner")
  const intermediate = track.units.filter(u => u.difficulty === "Intermediate")
  const advanced = track.units.filter(u => u.difficulty === "Advanced")

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">

      {/* Beginner */}
      {beginner.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Beginner" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {beginner.map(u => <UnitTile key={u.id} unit={u} trackId={track.id} />)}
          </div>
        </div>
      )}

      {/* Intermediate */}
      {intermediate.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Intermediate" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {intermediate.map(u => <UnitTile key={u.id} unit={u} trackId={track.id} />)}
          </div>
        </div>
      )}

      {/* Advanced */}
      {advanced.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Advanced" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {advanced.map(u => <UnitTile key={u.id} unit={u} trackId={track.id} />)}
          </div>
        </div>
      )}

    </div>
  )
}
