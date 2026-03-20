import { NextResponse } from "next/server"

import { getServerSession } from "@/server/auth/session"
import { awardXP } from "@/lib/studentTracking"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, data, context } = body

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 })
    }

    const result = await awardXP({
      studentId: session.user.id,
      action,
      data,
      context
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error awarding XP:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
