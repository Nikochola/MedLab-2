import { NextResponse } from "next/server"

import { acceptInstitutionInvite, acceptStudentInvite } from "@/server/actions/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = String(body?.token || "").trim()
  const password = String(body?.password || "")
  const kind = body?.kind === "institution" ? "institution" : "student"

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 })
  }

  const result = kind === "institution"
    ? await acceptInstitutionInvite(token, password)
    : await acceptStudentInvite(token, password)

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
