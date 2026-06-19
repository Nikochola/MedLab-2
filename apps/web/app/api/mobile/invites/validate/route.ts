import { NextResponse } from "next/server"

import { validateInstitutionInviteToken, validateInviteToken } from "@/server/actions/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = String(body?.token || "").trim()
  const kind = body?.kind === "institution" ? "institution" : "student"

  if (!token) {
    return NextResponse.json({ error: "Missing invitation token." }, { status: 400 })
  }

  const result = kind === "institution"
    ? await validateInstitutionInviteToken(token)
    : await validateInviteToken(token)

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
