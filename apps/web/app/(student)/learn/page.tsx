"use client"

import Link from "next/link"
import {
  HeartPulse,
  ScanSearch,
  ArrowRight,
  Play,
  Target,
  Sparkles,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useStudentStats } from "@/lib/hooks/useStudentStats"

// ── Training tracks ─────────────────────────────────────────────────────

const tracks = [
  {
    id: "ecg-fundamentals",
    title: "ECG Fundamentals",
    description: "Rhythm recognition, axis determination, and interval analysis through progressive drills.",
    icon: HeartPulse,
    href: "/learn/ecg-fundamentals",
    simulations: 24,
    accent: "#0066FF",
    accentLight: "#EEF3FF",
  },
  {
    id: "chest-xray",
    title: "Chest X-Ray Interpretation",
    description: "Systematic review of projection, quality, and pathology patterns across real cases.",
    icon: ScanSearch,
    href: "/learn/chest-xray",
    simulations: 18,
    accent: "#0E0F12",
    accentLight: "#F5F5F3",
  },
]

// ── Quick practice options ──────────────────────────────────────────────

const quickPractice = [
  {
    title: "ECG Drill",
    description: "Timed rhythm identification",
    href: "/ecg/practice",
    icon: HeartPulse,
  },
  {
    title: "Case Set",
    description: "Mixed clinical scenarios",
    href: "/ecg/cases",
    icon: ClipboardCheck,
  },
  {
    title: "Simulation",
    description: "Full diagnostic workup",
    href: "/ecg",
    icon: Stethoscope,
  },
]

// ── Page ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const { user } = useAuth()
  const { stats, isLoading } = useStudentStats(user?.id)
  const firstName = user?.name?.split(" ")[0] || "there"
  const hasActivity = stats && stats.casesCompleted + stats.simulationsCompleted > 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Greeting + resume */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold" style={{ color: "#0E0F12" }}>
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#9B9A94" }}>
            {hasActivity
              ? "Pick up where you left off, or start something new."
              : "Start your first training track or jump into a quick drill."}
          </p>
        </div>

        {/* Continue / Recommended action */}
        <ResumeCard stats={stats} isLoading={isLoading} hasActivity={!!hasActivity} />

        {/* Training tracks */}
        <div className="mt-10">
          <SectionLabel>Training tracks</SectionLabel>
          <div className="mt-3 space-y-3">
            {tracks.map((track) => (
              <Link
                key={track.id}
                href={track.href}
                className="group flex items-center gap-5 rounded-2xl px-5 py-5 transition-colors"
                style={{ border: "1px solid #E8E6DF" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D9FF"; e.currentTarget.style.backgroundColor = "#FAFAFA" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6DF"; e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: track.accentLight }}
                >
                  <track.icon className="h-5 w-5" style={{ color: track.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold" style={{ color: "#0E0F12" }}>{track.title}</p>
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: "#9B9A94" }}>{track.description}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium" style={{ color: "#9B9A94" }}>{track.simulations} simulations</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#9B9A94" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick practice */}
        <div className="mt-10">
          <SectionLabel>Quick practice</SectionLabel>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {quickPractice.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl px-4 py-4 transition-colors"
                style={{ backgroundColor: "#F5F5F3" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EEF3FF" }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F5F5F3" }}
              >
                <item.icon className="h-5 w-5 mb-3" style={{ color: "#9B9A94" }} />
                <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9B9A94" }}>{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Review prompt */}
        <div
          className="mt-10 rounded-2xl px-5 py-4"
          style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}
        >
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#0066FF" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#0066FF" }}>
                Focused review builds retention
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#4D8AFF" }}>
                Short, targeted practice sessions outperform long study marathons. Focus on your weakest area first, then run a mixed case set to consolidate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9B9A94" }}>
      {children}
    </p>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function ResumeCard({
  stats,
  isLoading,
  hasActivity,
}: {
  stats: ReturnType<typeof useStudentStats>["stats"]
  isLoading: boolean
  hasActivity: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl px-5 py-5 animate-pulse" style={{ backgroundColor: "#F5F5F3" }}>
        <div className="h-5 w-48 rounded-lg" style={{ backgroundColor: "#E8E6DF" }} />
        <div className="h-4 w-64 rounded-lg mt-2" style={{ backgroundColor: "#E8E6DF" }} />
      </div>
    )
  }

  if (hasActivity) {
    return (
      <Link
        href="/ecg"
        className="group flex items-center gap-4 rounded-2xl px-5 py-5 transition-colors"
        style={{ backgroundColor: "#0066FF" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0052CC" }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#0066FF" }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
          <Play className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white">Continue practicing</p>
          <p className="text-sm mt-0.5 text-white/70">
            {stats?.simulationsCompleted ?? 0} simulations completed &middot; {stats?.casesCompleted ?? 0} cases solved
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-white/60 transition-transform group-hover:translate-x-0.5 shrink-0" />
      </Link>
    )
  }

  return (
    <Link
      href="/ecg"
      className="group flex items-center gap-4 rounded-2xl px-5 py-5 transition-colors"
      style={{ backgroundColor: "#0066FF" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0052CC" }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#0066FF" }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">Start your first simulation</p>
        <p className="text-sm mt-0.5 text-white/70">Begin with an ECG rhythm drill to warm up.</p>
      </div>
      <ArrowRight className="h-5 w-5 text-white/60 transition-transform group-hover:translate-x-0.5 shrink-0" />
    </Link>
  )
}
