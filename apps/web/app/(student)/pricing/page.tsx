"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  Heartbeat,
  Scan,
  Books,
  ChartLineUp,
  CheckCircle,
  CreditCard,
  Lock,
  Sparkle,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useGating } from "@/contexts/GatingContext"

type BillingInterval = "monthly" | "yearly"

const CHECKOUT_SESSION_STORAGE_KEY = "medlab_pending_checkout_session"

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
    description: "Every radiology case, without daily limits.",
  },
  {
    icon: Books,
    color: "#0066FF",
    bg: "#EEF3FF",
    border: "#C7D9FF",
    title: "Complete case libraries",
    description: "All specialties, all difficulty levels, unrestricted.",
  },
  {
    icon: ChartLineUp,
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
    title: "Full progress analytics",
    description: "Track growth across sessions, streaks, and case performance.",
  },
]

function getIntervalFromSearch(value: string | null): BillingInterval {
  return value === "monthly" ? "monthly" : "yearly"
}

export default function PricingPage() {
  const searchParams = useSearchParams()
  const { plan, status, isLoading, refresh } = useGating()
  const [interval, setInterval] = useState<BillingInterval>(getIntervalFromSearch(searchParams.get("interval")))
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const autoCheckoutStarted = useRef(false)

  const nextPath = useMemo(() => {
    const next = searchParams.get("next")
    if (!next || !next.startsWith("/") || next.startsWith("//")) return "/learn"
    return next
  }, [searchParams])

  const source = searchParams.get("source") === "marketing" ? "marketing" : "app"
  const intent = searchParams.get("intent")
  const queryStatus = searchParams.get("status")

  const isProActive = plan === "pro" && (status === "active" || status === "trialing")
  const hasManageableSubscription = plan === "pro" || ["active", "trialing", "paused", "past_due", "canceled"].includes(status)

  useEffect(() => {
    setInterval(getIntervalFromSearch(searchParams.get("interval")))
  }, [searchParams])

  useEffect(() => {
    if (queryStatus === "cancelled") {
      toast("Checkout cancelled", {
        description: "No changes were made to your subscription.",
      })
    }
  }, [queryStatus])

  useEffect(() => {
    if (isLoading || isProActive || checkoutLoading || autoCheckoutStarted.current) return
    if (intent !== "checkout") return

    autoCheckoutStarted.current = true
    void handleCheckout()
  }, [checkoutLoading, intent, isLoading, isProActive])

  async function handleCheckout() {
    try {
      setCheckoutLoading(true)
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval,
          next: nextPath,
          source,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create checkout session.")
      }

      if (typeof window !== "undefined" && data?.sessionId) {
        sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, data.sessionId)
      }

      window.location.assign(data.checkoutUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout.")
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function handleManageBilling() {
    try {
      setPortalLoading(true)
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Failed to open billing portal.")
      }

      window.location.assign(data.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal.")
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleRefreshStatus() {
    try {
      await refresh()
      toast.success("Billing status refreshed.")
    } catch {
      toast.error("Failed to refresh billing state.")
    }
  }

  const price = interval === "monthly" ? "$12" : "$99"
  const periodLabel = interval === "monthly" ? "/month" : "/year"
  const subline = interval === "monthly" ? "Billed monthly" : "Equivalent to $8.25/month, billed yearly"
  const primaryActionLabel = interval === "monthly" ? "Upgrade to Pro Monthly" : "Upgrade to Pro Yearly"

  return (
    <div className="h-full flex items-center justify-center px-6 py-6 lg:px-12">
      <div className="grid w-full max-w-5xl items-start gap-8 lg:grid-cols-[1fr_390px] lg:gap-12">
        <div>
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
            style={{ backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" }}
          >
            <Lock size={11} weight="fill" style={{ color: "#0066FF" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#0047CC" }}>
              Student Pro
            </span>
          </div>

          <h1
            className="mb-3 text-[26px] font-bold leading-tight lg:text-[34px]"
            style={{ color: "#0E0F12", letterSpacing: "-0.03em" }}
          >
            Unlock everything in MedLab
          </h1>
          <p className="mb-8 max-w-[480px] text-[14px] leading-relaxed" style={{ color: "#6B6A65" }}>
            Upgrade for unlimited practice, full case access, and complete performance analytics. Your existing free progress stays intact.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {proFeatures.map(({ icon: Icon, color, bg, border, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#FAFAF8", border: "1.5px solid #E8E6DF" }}
              >
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
                >
                  <Icon size={18} weight="fill" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#0E0F12" }}>{title}</p>
                  <p className="mt-0.5 text-[12px]" style={{ color: "#9B9A94" }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "white",
            border: "1.5px solid #E8E6DF",
            boxShadow: "0 4px 32px -4px rgba(0,0,0,0.08)",
          }}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#9B9A94" }}>MedLab Pro</p>
              <div className="mt-2 inline-flex rounded-[10px] p-1" style={{ backgroundColor: "#F5F5F3", border: "1.5px solid #E8E6DF" }}>
                {(["monthly", "yearly"] as BillingInterval[]).map((value) => {
                  const selected = value === interval
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInterval(value)}
                      className="rounded-[8px] px-3.5 py-2 text-[13px] font-semibold transition-colors"
                      style={{
                        backgroundColor: selected ? "white" : "transparent",
                        color: selected ? "#0E0F12" : "#9B9A94",
                        boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {value === "monthly" ? "Monthly" : "Yearly"}
                    </button>
                  )
                })}
              </div>
            </div>

            {isProActive && (
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ backgroundColor: "#ECFDF5", border: "1.5px solid #A7F3D0", color: "#15803D" }}
              >
                <Sparkle size={13} weight="fill" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Active</span>
              </div>
            )}
          </div>

          <div className="mb-1 flex items-end gap-1">
            <span className="text-[42px] font-bold leading-none" style={{ color: "#0E0F12", letterSpacing: "-0.04em" }}>
              {price}
            </span>
            <span className="mb-2 text-[14px] font-medium" style={{ color: "#9B9A94" }}>{periodLabel}</span>
          </div>
          <p className="mb-6 text-[13px]" style={{ color: "#9B9A94" }}>
            {subline}
          </p>

          <div className="mb-6 flex flex-col gap-2.5">
            {proFeatures.map(({ title }) => (
              <div key={title} className="flex items-center gap-2">
                <CheckCircle size={15} weight="fill" style={{ color: "#0066FF", flexShrink: 0 }} />
                <span className="text-[13px]" style={{ color: "#3D3C38" }}>{title}</span>
              </div>
            ))}
          </div>

          {isProActive ? (
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard size={18} weight="fill" />}
                Manage billing
              </Button>
              <button
                type="button"
                onClick={handleRefreshStatus}
                className="w-full text-center text-[12px] font-medium"
                style={{ color: "#9B9A94" }}
              >
                Refresh subscription state
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={checkoutLoading || isLoading}
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryActionLabel}
              </Button>

              {hasManageableSubscription && (
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage existing billing"}
                </Button>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: "#9B9A94" }}>
            Secure checkout via Dodo Payments. Cancel from the billing portal at any time.
          </p>

          <div className="mt-5 border-t pt-5" style={{ borderTopColor: "#E8E6DF" }}>
            <Link href={nextPath} className="block text-center text-[13px] font-medium" style={{ color: "#9B9A94" }}>
              Continue with free plan
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
