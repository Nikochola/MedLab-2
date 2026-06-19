"use client"

import { toast } from "sonner"

/**
 * Inspect an AI-route response for the quota (402) / rate-limit (429) signals
 * and surface the right user-facing message. Returns true when the response was
 * a limit error and the caller should stop (e.g. reset loading state and bail).
 *
 *   const res = await fetch("/api/ai/feedback", { ... })
 *   if (handleAiLimit(res)) { setLoading(false); return }
 */
export function handleAiLimit(response: Response): boolean {
  if (response.status === 402) {
    toast.error("Daily free AI limit reached", {
      description: "Upgrade to Pro for unlimited AI assistance.",
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "/pricing"
        },
      },
    })
    return true
  }

  if (response.status === 429) {
    toast.error("Too many requests", {
      description: "Please slow down and try again in a moment.",
    })
    return true
  }

  if (response.status === 401) {
    toast.error("Please sign in to use AI features.")
    return true
  }

  return false
}
