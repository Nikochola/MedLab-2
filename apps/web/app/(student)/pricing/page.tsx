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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-5 py-10 md:py-14">

        {/* Back */}
        <Link
          href={nextPath}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-10"
          style={{ color: "#6B6A65" }}
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 mb-4"
            style={{ backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" }}
          >
            <Lock size={12} weight="fill" style={{ color: "#0066FF" }} />
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: "#0047CC" }}>
              Pro Feature
            </span>
          </div>
          <h1 className="text-[28px] md:text-[34px] font-bold leading-tight mb-3" style={{ color: "#0E0F12", letterSpacing: "-0.03em" }}>
            Unlock everything in MedLab
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "#6B6A65" }}>
            You've hit the free plan limit. Upgrade to Pro for unlimited practice, full case access, and detailed analytics.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-3 mb-8">
          {proFeatures.map(({ icon: Icon, color, bg, border, title, description }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl px-4 py-4"
              style={{ backgroundColor: "#FAFAF8", border: "1.5px solid #E8E6DF" }}
            >
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 40, height: 40, backgroundColor: bg, border: `1.5px solid ${border}` }}
              >
                <Icon size={20} weight="fill" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: "#0E0F12" }}>{title}</p>
                <p className="text-[13px]" style={{ color: "#9B9A94" }}>{description}</p>
              </div>
              <CheckCircle size={18} weight="fill" style={{ color: "#0066FF", flexShrink: 0 }} className="ml-auto" />
            </div>
          ))}
        </div>

        {/* Pricing card */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{
            backgroundColor: "white",
            border: "1.5px solid #E8E6DF",
            boxShadow: "0 4px 24px -4px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-end gap-1.5 mb-1">
            <span className="text-[36px] font-bold leading-none" style={{ color: "#0E0F12", letterSpacing: "-0.04em" }}>$9</span>
            <span className="text-[14px] font-medium mb-1.5" style={{ color: "#9B9A94" }}>/month</span>
          </div>
          <p className="text-[13px] mb-6" style={{ color: "#9B9A94" }}>
            or $99/year — save 31%
          </p>

          <a
            href="mailto:support@medlabinteractive.com?subject=MedLab%20Pro%20Access%20Request"
            className="flex items-center justify-center gap-2 w-full rounded-[9px] px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "#0066FF",
              color: "white",
              border: "1.5px solid #0047CC",
              boxShadow: "0 3px 0 #0047CC",
            }}
          >
            <Envelope size={16} weight="fill" />
            Request Pro access
          </a>

          <p className="text-center text-[12px] mt-4" style={{ color: "#9B9A94" }}>
            Email us at{" "}
            <a
              href="mailto:support@medlabinteractive.com"
              className="underline underline-offset-2"
              style={{ color: "#6B6A65" }}
            >
              support@medlabinteractive.com
            </a>{" "}
            with your account email. We'll activate Pro manually while self-serve billing is in progress.
          </p>
        </div>

        {/* Continue free */}
        <div className="text-center">
          <Link
            href={nextPath}
            className="text-[13px] font-medium"
            style={{ color: "#9B9A94" }}
          >
            Continue with free plan
          </Link>
        </div>

      </div>
    </div>
  )
}
