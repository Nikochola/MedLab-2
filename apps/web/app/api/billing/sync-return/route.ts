import { NextResponse } from "next/server"

import { sanitizeNextPath, syncCheckoutReturn } from "@/lib/billing/dodo"
import { ensureAppUser, getServerSession } from "@/server/auth/session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    const appUser = await ensureAppUser(session)

    if (!appUser?.id || !appUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : null
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null
    const next = sanitizeNextPath(typeof body?.next === "string" ? body.next : null, "/learn")

    const result = await syncCheckoutReturn({
      userId: appUser.id,
      email: appUser.email,
      subscriptionId,
      sessionId,
    })

    return NextResponse.json({
      synced: Boolean(result.subscriptionId),
      subscriptionId: result.subscriptionId,
      paymentStatus: result.paymentStatus,
      next,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync checkout return."
    const status = typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500

    console.error("[billing/sync-return]", error)
    return NextResponse.json({ error: message }, { status })
  }
}
