import { NextResponse } from "next/server"

import { FREE_AI_DAILY_LIMIT, FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freeTier"
import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function GET(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const [{ data: subscription }, { data: usageRows }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("usage_limits")
      .select("feature,usage_count,last_reset_at")
      .eq("user_id", context.user.id),
  ])

  const plan = subscription?.plan === "pro" ? "pro" : "free"
  const status = subscription?.status || "inactive"
  const proActive = plan === "pro" && (status === "active" || status === "trialing")
  const usage = Object.fromEntries((usageRows || []).map((row: any) => [row.feature, row.usage_count || 0]))

  return NextResponse.json({
    plan,
    status,
    subscription,
    limits: {
      practiceDaily: FREE_PRACTICE_DAILY_LIMIT,
      aiDaily: FREE_AI_DAILY_LIMIT,
    },
    usage,
    entitlements: {
      "ecg.practice": proActive || (usage.ecg_practice || 0) < FREE_PRACTICE_DAILY_LIMIT,
      "xray.practice": proActive || (usage.xray_practice || 0) < FREE_PRACTICE_DAILY_LIMIT,
      "ct.practice": proActive,
      "ecg.cases": proActive,
      "xray.cases": proActive,
      "ct.cases": proActive,
      "progress.basic": true,
    },
  })
}
