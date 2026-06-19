import { NextResponse } from "next/server"

import { getServerSession } from "@/server/auth/session"
import { checkUsageLimit, getSubscription, incrementUsage } from "@/lib/gating/server"
import { FREE_AI_DAILY_LIMIT } from "@/lib/freeTier"
import { rateLimit } from "@/lib/rateLimit"

const AI_USAGE_FEATURE = "ai_assist"

// Burst protection for everyone (incl. Pro): caps requests per user regardless
// of plan, so a single account can't hammer the AI provider and run up costs.
const AI_BURST_LIMIT = Number(process.env.AI_BURST_LIMIT || 20)
const AI_BURST_WINDOW_MS = 60_000

type AiAccessGranted = {
  ok: true
  userId: string
  plan: "free" | "pro"
  /** Call after a successful AI generation to count it against the free quota (no-op for Pro). */
  commitUsage: () => Promise<void>
}

type AiAccessDenied = {
  ok: false
  response: NextResponse
}

export type AiAccess = AiAccessGranted | AiAccessDenied

/**
 * Server-side gate for the AI endpoints. Requires an authenticated session and,
 * for free-plan users, enforces a daily usage cap. Returns either a granted
 * result (with a `commitUsage` hook) or a ready-to-return error response.
 */
export async function authorizeAiRequest(): Promise<AiAccess> {
  const session = await getServerSession()
  const userId = session?.user?.id

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  // Per-user burst limit (applies to all plans).
  const burst = rateLimit(`ai:${userId}`, AI_BURST_LIMIT, AI_BURST_WINDOW_MS)
  if (!burst.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(burst.retryAfterSeconds) } }
      ),
    }
  }

  const sub = await getSubscription(userId)
  const isPro = sub.plan === "pro" && (sub.status === "active" || sub.status === "trialing")

  if (isPro) {
    return { ok: true, userId, plan: "pro", commitUsage: async () => {} }
  }

  const { allowed, current } = await checkUsageLimit(userId, AI_USAGE_FEATURE, FREE_AI_DAILY_LIMIT)

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Daily free AI limit reached. Upgrade to Pro for unlimited AI assistance.",
          code: "AI_LIMIT_REACHED",
          limit: FREE_AI_DAILY_LIMIT,
          current,
        },
        { status: 402 }
      ),
    }
  }

  return {
    ok: true,
    userId,
    plan: "free",
    commitUsage: async () => {
      await incrementUsage(userId, AI_USAGE_FEATURE)
    },
  }
}
