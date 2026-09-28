import { NextResponse } from "next/server"

import { getSubscription } from "@/lib/gating/server"
import { getServerSession } from "@/server/auth/session"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const subscription = await getSubscription(session.user.id)
  return NextResponse.json(subscription, { headers: { "cache-control": "private, no-store" } })
}
