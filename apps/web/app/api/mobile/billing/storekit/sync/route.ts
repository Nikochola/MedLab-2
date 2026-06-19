import { NextResponse } from "next/server"

import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function intervalForProduct(productId: string) {
  return productId.toLowerCase().includes("year") ? "yearly" : "monthly"
}

export async function POST(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const body = await request.json().catch(() => null)
  const productId = String(body?.productId || "")
  const transactionId = String(body?.transactionId || "")
  const originalTransactionId = String(body?.originalTransactionId || transactionId)
  const environment = String(body?.environment || "unknown")
  const signedTransactionInfo = typeof body?.signedTransactionInfo === "string" ? body.signedTransactionInfo : null
  const expiresAt = typeof body?.expiresAt === "string" ? body.expiresAt : null

  if (!productId || !transactionId || !originalTransactionId) {
    return NextResponse.json({ error: "Missing StoreKit transaction fields." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: context.user.id,
        plan: "pro",
        status: "active",
        billing_interval: intervalForProduct(productId),
        current_period_end: expiresAt,
        apple_original_transaction_id: originalTransactionId,
        apple_latest_transaction_id: transactionId,
        apple_product_id: productId,
        apple_environment: environment,
        apple_signed_transaction_info: signedTransactionInfo,
        apple_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subscription: data })
}
