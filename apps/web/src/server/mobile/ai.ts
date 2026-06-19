import { NextResponse } from "next/server"

import { checkUsageLimit, getSubscription, incrementUsage } from "@/lib/gating/server"
import { FREE_AI_DAILY_LIMIT } from "@/lib/freeTier"
import { rateLimit } from "@/lib/rateLimit"

const AI_USAGE_FEATURE = "ai_assist"
const AI_BURST_LIMIT = Number(process.env.AI_BURST_LIMIT || 20)
const AI_BURST_WINDOW_MS = 60_000

type MobileAiAccessGranted = {
  ok: true
  userId: string
  plan: "free" | "pro"
  commitUsage: () => Promise<void>
}

type MobileAiAccessDenied = {
  ok: false
  response: NextResponse
}

export type MobileAiAccess = MobileAiAccessGranted | MobileAiAccessDenied

export async function authorizeMobileAiRequest(userId: string): Promise<MobileAiAccess> {
  const burst = rateLimit(`mobile-ai:${userId}`, AI_BURST_LIMIT, AI_BURST_WINDOW_MS)
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
