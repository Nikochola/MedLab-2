import { NextResponse } from "next/server"

import { syncSubscriptionFromDodo, verifyDodoWebhookSignature } from "@/lib/billing/dodo"
import { supabaseAdmin } from "@/server/supabaseAdmin"

type DodoWebhookEvent = {
  type?: string
  data?: Record<string, unknown>
}

function hasSubscriptionId(value: Record<string, unknown>) {
  return typeof value.subscription_id === "string" && value.subscription_id.length > 0
}

function isDuplicateEvent(error: unknown) {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? error.code : null
  return code === "23505"
}

export async function POST(request: Request) {
  const webhookId = request.headers.get("webhook-id")
  const webhookSignature = request.headers.get("webhook-signature")
  const webhookTimestamp = request.headers.get("webhook-timestamp")

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    return NextResponse.json({ error: "Missing Dodo webhook headers." }, { status: 400 })
  }

  const rawBody = await request.text()

  try {
    verifyDodoWebhookSignature({
      payload: rawBody,
      webhookId,
      webhookSignature,
      webhookTimestamp,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let event: DodoWebhookEvent
  try {
    event = JSON.parse(rawBody) as DodoWebhookEvent
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const eventType = typeof event.type === "string" ? event.type : null

  const { data: existingEvent, error: existingError } = await supabaseAdmin
    .from("billing_webhook_events")
    .select("id")
    .eq("provider", "dodo")
    .eq("webhook_id", webhookId)
    .maybeSingle()

  if (!existingError && existingEvent?.id) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (eventType?.startsWith("subscription.") && event.data && hasSubscriptionId(event.data)) {
      await syncSubscriptionFromDodo(event.data as Parameters<typeof syncSubscriptionFromDodo>[0])
    }

    const { error: insertError } = await supabaseAdmin
      .from("billing_webhook_events")
      .insert({
        provider: "dodo",
        webhook_id: webhookId,
        event_type: eventType,
        payload: event as Record<string, unknown>,
      })

    if (insertError && !isDuplicateEvent(insertError)) {
      throw new Error(insertError.message)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[webhooks/dodo]", error)
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 })
  }
}
