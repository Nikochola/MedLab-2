import { NextResponse } from "next/server"

import { cancelDodoSubscription } from "@/lib/billing/dodo"
import { ensureAppUser, getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function POST() {
  try {
    const session = await getServerSession()
    const appUser = await ensureAppUser(session)

    if (!appUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id, dodo_subscription_id, status")
      .eq("user_id", appUser.id)
      .maybeSingle()

    if (!subscription?.dodo_subscription_id) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 404 })
    }

    if (subscription.status === "canceled") {
      return NextResponse.json({ error: "Subscription is already cancelled." }, { status: 400 })
    }

    await cancelDodoSubscription(subscription.dodo_subscription_id)

    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled", provider_status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", subscription.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel subscription."
    const status = typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500

    console.error("[billing/cancel]", error)
    return NextResponse.json({ error: message }, { status })
  }
}
