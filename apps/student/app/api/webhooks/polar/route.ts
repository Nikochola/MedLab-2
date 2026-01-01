import { NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get("Webhook-Signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("POLAR_WEBHOOK_SECRET is not set");
        return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    let event;
    try {
        event = validateEvent(body, { "webhook-signature": signature }, webhookSecret);
    } catch (error) {
        console.error("Webhook verification failed:", error);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // Handle events
    try {
        switch (event.type) {
            case "subscription.created":
            case "subscription.updated":
            case "subscription.active": {
                const sub = event.data;
                // Map Polar subscription to our DB
                // Polar provides 'metadata' which we can use to store user_id during checkout
                // Or we can look it up by email
                const userId = sub.customer.metadata?.user_id || sub.metadata?.user_id;

                if (!userId) {
                    console.error("No user_id found in subscription metadata", sub);
                    // Try to lookup by email if metadata is missing
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id")
                        .eq("email", sub.customer.email)
                        .single();

                    if (!userData) {
                        console.error("User not found for email:", sub.customer.email);
                        return NextResponse.json({ error: "User not found" }, { status: 404 });
                    }
                }

                const effectiveUserId = userId || (await supabase.from("users").select("id").eq("email", sub.customer.email).single()).data?.id;

                if (!effectiveUserId) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }

                // Determine plan from Polar product/benefit
                // For simplicity, we assume if they have an active subscription, it's 'pro'
                // You can refine this by checking product IDs
                const plan = "pro";

                await supabase.from("subscriptions").upsert({
                    user_id: effectiveUserId,
                    polar_customer_id: (sub as any).customerId || (sub as any).customer_id,
                    polar_subscription_id: sub.id,
                    plan: plan,
                    status: sub.status,
                    current_period_end: (sub as any).currentPeriodEnd?.toISOString() || (sub as any).current_period_end?.toISOString(),
                    updated_at: new Date().toISOString(),
                });
                break;
            }

            case "subscription.revoked":
            case "subscription.canceled": {
                const sub = event.data;
                const { data: existingSub } = await supabase
                    .from("subscriptions")
                    .select("user_id")
                    .eq("polar_subscription_id", sub.id)
                    .single();

                if (existingSub) {
                    await supabase.from("subscriptions").update({
                        status: sub.status,
                        plan: "free", // Revert to free
                        updated_at: new Date().toISOString(),
                    }).eq("user_id", existingSub.user_id);
                }
                break;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
}
