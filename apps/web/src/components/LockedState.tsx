"use client"

import { Lock, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

interface LockedStateProps {
  title: string
  description: string
  variant?: "limit" | "locked"
}

export function LockedState({ title, description, variant = "locked" }: LockedStateProps) {
  const { user } = useAuth()

  const handleUpgrade = () => {
    const next = encodeURIComponent(window.location.pathname)
    if (!user) {
      window.location.assign(`/student/login?next=${next}`)
      return
    }
    window.location.assign(`/pricing?next=${next}`)
  }

  const isLimit = variant === "limit"
  const Icon = isLimit ? Clock : Lock

  const iconStyle = isLimit
    ? { backgroundColor: "#FFF7ED", border: "1.5px solid #FDE8C8", color: "#D97706" }
    : { backgroundColor: "#EEF3FF", border: "1.5px solid #C7D9FF", color: "#0066FF" }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 text-center">

        {/* Icon */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={iconStyle}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-[#232834] dark:text-[#ecf1f8]">
            {title}
          </h2>
          <p className="mx-auto max-w-[280px] text-sm leading-relaxed" style={{ color: "#6B6A65" }}>
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2">
          <Button size="lg" variant="default" onClick={handleUpgrade} className="gap-2">
            {user ? "Upgrade to Pro" : "Sign in to Access"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {user && isLimit && (
            <p className="text-xs" style={{ color: "#9B9A94" }}>
              Resets at midnight ·{" "}
              <button
                className="cursor-pointer underline underline-offset-2"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </p>
          )}
        </div>

    </div>
  )
}
