import { NextResponse } from "next/server"

import { AuthAccountExistsError, provisionPasswordAuthUser } from "@/server/auth/provision"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = String(body?.email || "").trim().toLowerCase()
  const password = String(body?.password || "")
  const name = String(body?.name || "").trim()

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
  }

  try {
    await provisionPasswordAuthUser({ email, password, name, primaryRole: "student" })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof AuthAccountExistsError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Failed to create account."
    return NextResponse.json({ error: message }, { status: error instanceof AuthAccountExistsError ? 409 : 500 })
  }
}
