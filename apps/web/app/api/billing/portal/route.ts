import { NextResponse } from "next/server"

import { createDodoCustomerPortalSession, resolveCustomerPortalTarget } from "@/lib/billing/dodo"
import { ensureAppUser, getServerSession } from "@/server/auth/session"

export async function POST() {
  try {
    const session = await getServerSession()
    const appUser = await ensureAppUser(session)

    if (!appUser?.id || !appUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = await resolveCustomerPortalTarget({
      userId: appUser.id,
      email: appUser.email,
    })

    if (!customerId) {
      return NextResponse.json({ error: "No Dodo customer found for this account." }, { status: 404 })
    }

    const portal = await createDodoCustomerPortalSession(customerId)
    return NextResponse.json({ url: portal.link })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create customer portal session."
    const status = typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500

    console.error("[billing/portal]", error)
    return NextResponse.json({ error: message }, { status })
  }
}
