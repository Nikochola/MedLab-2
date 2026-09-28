import { NextResponse } from "next/server"

import { getSessionWithRole } from "@/server/auth/session"
import { createEnterpriseApiKey, getEnterpriseWorkspace, requireInstitutionRole, revokeEnterpriseApiKey } from "@/server/institution"

async function adminContext() {
  const session = await getSessionWithRole()
  if (!session?.session.user?.id) return null
  try {
    return await requireInstitutionRole(session.session.user.id, ["INSTITUTION_ADMIN"])
  } catch {
    return null
  }
}

export async function GET() {
  const context = await adminContext()
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const workspace = await getEnterpriseWorkspace(context)
  if (!workspace.hasEnterprise) return NextResponse.json({ error: "Enterprise plan required" }, { status: 403 })
  return NextResponse.json({ keys: workspace.apiKeys }, { headers: { "cache-control": "private, no-store" } })
}

export async function POST(request: Request) {
  const context = await adminContext()
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > 16_384) return NextResponse.json({ error: "Request too large" }, { status: 413 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  try {
    const result = await createEnterpriseApiKey(context, {
      name: String(body.name || ""),
      scopes: Array.isArray(body.scopes) ? body.scopes.map(String) : [],
      dailyLimit: Number(body.dailyLimit || 10_000),
      expiresAt: body.expiresAt ? String(body.expiresAt) : null
    })
    return NextResponse.json(result, { status: 201, headers: { "cache-control": "private, no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "API key could not be created" }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const context = await adminContext()
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.keyId) return NextResponse.json({ error: "Key ID is required" }, { status: 400 })
  try {
    await revokeEnterpriseApiKey(context, String(body.keyId))
    return NextResponse.json({ revoked: true }, { headers: { "cache-control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "API key could not be revoked" }, { status: 400 })
  }
}
