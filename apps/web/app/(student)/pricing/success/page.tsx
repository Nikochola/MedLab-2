"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle, ClockCountdown, WarningCircle } from "@phosphor-icons/react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useGating } from "@/contexts/GatingContext"

const CHECKOUT_SESSION_STORAGE_KEY = "medlab_pending_checkout_session"

type SyncState = "syncing" | "success" | "pending" | "failed"

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const { refresh } = useGating()
  const [state, setState] = useState<SyncState>("syncing")
  const [message, setMessage] = useState("Confirming your subscription and refreshing access.")

  // Keep a stable initial value; update from URL only on the client to avoid hydration mismatch.
  const [nextPath, setNextPath] = useState("/learn")
  useEffect(() => {
    const next = searchParams.get("next")
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextPath(next)
  }, [searchParams])

  useEffect(() => {
    async function syncReturn() {
      const sessionId =
        searchParams.get("session_id") ||
        searchParams.get("sessionId") ||
        (typeof window !== "undefined" ? sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY) : null)

      const subscriptionId = searchParams.get("subscription_id") || searchParams.get("subscriptionId")

      try {
        const response = await fetch("/api/billing/sync-return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionId,
            sessionId,
            next: nextPath,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || "Failed to verify the checkout return.")
        }

        if (typeof window !== "undefined") {
          sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY)
        }

        await refresh()

        if (data.synced) {
          setState("success")
          setMessage("MedLab Pro is active on your account.")
          return
        }

        if (data.paymentStatus === "processing" || data.paymentStatus === "requires_customer_action") {
          setState("pending")
          setMessage("Your payment is still processing. Access will unlock as soon as Dodo confirms the subscription.")
          return
        }

        setState("failed")
        setMessage("We could not confirm an active Pro subscription from this return.")
      } catch (error) {
        setState("failed")
        setMessage(error instanceof Error ? error.message : "Failed to confirm the subscription.")
        toast.error("Billing confirmation failed.")
      }
    }

    void syncReturn()
  }, [nextPath, refresh, searchParams])

  const content = state === "success"
    ? {
      icon: <CheckCircle size={28} weight="fill" style={{ color: "#15803D" }} />,
      iconStyle: { backgroundColor: "#ECFDF5", border: "1.5px solid #A7F3D0" },
      title: "Pro unlocked",
      action: <Button asChild size="lg"><Link href={nextPath}>Continue</Link></Button>,
    }
    : state === "pending"
      ? {
        icon: <ClockCountdown size={28} weight="fill" style={{ color: "#D97706" }} />,
        iconStyle: { backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA" },
        title: "Payment processing",
        action: <Button asChild size="lg" variant="outline"><Link href="/pricing">Back to billing</Link></Button>,
      }
      : state === "failed"
        ? {
          icon: <WarningCircle size={28} weight="fill" style={{ color: "#B91C1C" }} />,
          iconStyle: { backgroundColor: "#FEF2F2", border: "1.5px solid #FECACA" },
          title: "Could not confirm billing",
          action: <Button asChild size="lg" variant="outline"><Link href="/pricing">Return to pricing</Link></Button>,
        }
        : {
          icon: <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#0066FF" }} />,
          iconStyle: { backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF" },
          title: "Confirming purchase",
          action: null,
        }

  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div
        className="w-full max-w-[520px] rounded-2xl p-8 text-center"
        style={{
          backgroundColor: "white",
          border: "1.5px solid #E8E6DF",
          boxShadow: "0 4px 32px -4px rgba(0,0,0,0.08)",
        }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={content.iconStyle}>
          {content.icon}
        </div>

        <h1 className="mb-3 text-[28px] font-bold" style={{ color: "#0E0F12", letterSpacing: "-0.03em" }}>
          {content.title}
        </h1>
        <p className="mx-auto mb-6 max-w-[380px] text-[14px] leading-relaxed" style={{ color: "#6B6A65" }}>
          {message}
        </p>

        <div className="flex justify-center">
          {content.action}
        </div>
      </div>
    </div>
  )
}
