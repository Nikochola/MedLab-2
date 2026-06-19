import { NextResponse } from "next/server"

import { createInstitutionAccessRequest } from "@/server/institution/access"
import { clientIpFromRequest, rateLimit } from "@/lib/rateLimit"

export async function POST(request: Request) {
  try {
    // Public, unauthenticated form — throttle by IP to limit spam/abuse.
    const limit = rateLimit(`request-access:${clientIpFromRequest(request)}`, 5, 60 * 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json()

    await createInstitutionAccessRequest({
      fullName: String(body.fullName || ""),
      workEmail: String(body.workEmail || ""),
      institutionName: String(body.institutionName || ""),
      institutionType: body.institutionType,
      estimatedStudents: Number(body.estimatedStudents || 0),
      message: String(body.message || ""),
      wantsMeeting: Boolean(body.wantsMeeting)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit request." },
      { status: 400 }
    )
  }
}
