import Link from "next/link"
import {
  Heartbeat,
  Scan,
  Books,
  ChartLineUp,
  ArrowLeft,
  CheckCircle,
  Envelope,
  Lock,
} from "@phosphor-icons/react/dist/ssr"

interface PricingPageProps {
  searchParams?: { next?: string }
}

const proFeatures = [
  {
    icon: Heartbeat,
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    title: "Unlimited ECG practice",
    description: "Full ECG case library with no monthly cap.",
  },
  {
    icon: Scan,
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    title: "Unlimited X-Ray sessions",
    description: "Every radiology case — chest, abdomen, and beyond.",
  },
  {
    icon: Books,
    color: "#0066FF",
    bg: "#EEF3FF",
    border: "#C7D9FF",
    title: "Complete case libraries",
    description: "Every specialty and difficulty level, unrestricted.",
  },
  {
    icon: ChartLineUp,
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
    title: "Full progress analytics",
    description: "Track your performance across sessions and time.",
  },
]

export default function PricingPage({ searchParams }: PricingPageProps) {
  const nextPath =
    searchParams?.next && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/learn"

  return (
    <div className="h-full flex flex-col justify-center px-6 py-6 lg:px-12">
      {/* Back */}
      <Link
        href={nextPath}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-8 self-start"
        style={{ color: "#6B6A65" }}
      >
        <ArrowLeft size={15} />
        Back
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-center w-full max-w-4xl mx-auto">

        {/* ── Left: hero + features ── */}
        <div>
          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 mb-4"
            style={{ backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" }}
          >
            <Lock size={11} weight="fill" style={{ color: "#0066FF" }} />
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "#0047CC" }}>
              Pro Feature
            </span>
          </div>

          <h1
            className="text-[26px] lg:text-[32px] font-bold leading-tight mb-3"
            style={{ color: "#0E0F12", letterSpacing: "-0.03em" }}
          >
            Unlock everything in MedLab
          </h1>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: "#6B6A65", maxWidth: 440 }}>
            You've hit the free plan limit. Upgrade to Pro for unlimited practice, full case access, and detailed analytics.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proFeatures.map(({ icon: Icon, color, bg, border, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#FAFAF8", border: "1.5px solid #E8E6DF" }}
              >
                <div
                  className="flex items-center justify-center rounded-xl shrink-0 mt-0.5"
                  style={{ width: 36, height: 36, backgroundColor: bg, border: `1.5px solid ${border}` }}
                >
                  <Icon size={18} weight="fill" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#0E0F12" }}>{title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#9B9A94" }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: pricing card ── */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "white",
            border: "1.5px solid #E8E6DF",
            boxShadow: "0 4px 32px -4px rgba(0,0,0,0.08)",
          }}
        >
          <p className="text-[13px] font-semibold mb-4" style={{ color: "#9B9A94" }}>MedLab Pro</p>

          <div className="flex items-end gap-1 mb-1">
            <span
              className="text-[42px] font-bold leading-none"
              style={{ color: "#0E0F12", letterSpacing: "-0.04em" }}
            >
              $9
            </span>
            <span className="text-[14px] font-medium mb-2" style={{ color: "#9B9A94" }}>/month</span>
          </div>
          <p className="text-[13px] mb-6" style={{ color: "#9B9A94" }}>
            or $99/year — save 31%
          </p>

          <div className="flex flex-col gap-2.5 mb-6">
            {proFeatures.map(({ title }) => (
              <div key={title} className="flex items-center gap-2">
                <CheckCircle size={15} weight="fill" style={{ color: "#0066FF", flexShrink: 0 }} />
                <span className="text-[13px]" style={{ color: "#3D3C38" }}>{title}</span>
              </div>
            ))}
          </div>

          <a
            href="mailto:support@medlabinteractive.com?subject=MedLab%20Pro%20Access%20Request"
            className="flex items-center justify-center gap-2 w-full rounded-[9px] px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90 mb-4"
            style={{
              backgroundColor: "#0066FF",
              color: "white",
              border: "1.5px solid #0047CC",
              boxShadow: "0 3px 0 #0047CC",
            }}
          >
            <Envelope size={16} weight="fill" />
            Request Pro
          </a>

          <p className="text-center text-[11px] leading-relaxed" style={{ color: "#9B9A94" }}>
            Email us your account address and we'll activate Pro manually. Self-serve billing coming soon.
          </p>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid #E8E6DF" }}>
            <Link
              href={nextPath}
              className="block text-center text-[13px] font-medium"
              style={{ color: "#9B9A94" }}
            >
              Continue with free plan
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
