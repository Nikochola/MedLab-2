import { NextResponse } from "next/server"

import { acceptInstitutionInvite } from "@/server/actions/auth"

// All invites (students included) are accepted through the magic-link flow.
// Passwords are never set from an invite token.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = String(body?.token || "").trim()

  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 })
  }

  const result = await acceptInstitutionInvite(token)

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
