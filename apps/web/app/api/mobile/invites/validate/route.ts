import { NextResponse } from "next/server"

import { validateInstitutionInviteToken } from "@/server/actions/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = String(body?.token || "").trim()

  if (!token) {
    return NextResponse.json({ error: "Missing invitation token." }, { status: 400 })
  }

  const result = await validateInstitutionInviteToken(token)

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
