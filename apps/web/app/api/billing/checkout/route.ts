import { NextResponse } from "next/server"

import { createDodoCheckoutSession, findDodoCustomerByEmail, sanitizeNextPath, type BillingInterval, type BillingSource } from "@/lib/billing/dodo"
import { ensureAppUser, getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly"
}

function isBillingSource(value: unknown): value is BillingSource {
  return value === "marketing" || value === "app"
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const appUser = await ensureAppUser(session)

    if (!appUser?.id || !appUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const interval = isBillingInterval(body?.interval) ? body.interval : null
    const source = isBillingSource(body?.source) ? body.source : "app"
    const next = sanitizeNextPath(typeof body?.next === "string" ? body.next : null, "/learn")

    if (!interval) {
      return NextResponse.json({ error: "A valid billing interval is required." }, { status: 400 })
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan,status,dodo_customer_id")
      .eq("user_id", appUser.id)
      .maybeSingle()

    if (
      existingSubscription?.plan === "pro" &&
      (existingSubscription.status === "active" || existingSubscription.status === "trialing")
    ) {
      return NextResponse.json({ error: "This account already has an active Pro subscription." }, { status: 409 })
    }

    const customer = existingSubscription?.dodo_customer_id
      ? { customer_id: existingSubscription.dodo_customer_id }
      : await findDodoCustomerByEmail(appUser.email)

    const checkout = await createDodoCheckoutSession({
      userId: appUser.id,
      email: appUser.email,
      name: appUser.name || appUser.email.split("@")[0] || "MedLab Student",
      interval,
      next,
      source,
      customerId: customer?.customer_id || null,
    })

    if (!checkout.checkout_url) {
      return NextResponse.json({ error: "Dodo did not return a checkout URL." }, { status: 502 })
    }

    return NextResponse.json({
      sessionId: checkout.session_id,
      checkoutUrl: checkout.checkout_url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session."
    const status = typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500

    console.error("[billing/checkout]", error)
    return NextResponse.json({ error: message }, { status })
  }
}
