import { NextResponse } from "next/server"

import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function GET(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  return NextResponse.json({ profile: context.profile })
}

export async function PATCH(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const body = await request.json().catch(() => null)
  const updates: Record<string, unknown> = {}

  if (typeof body?.fullName === "string") updates.full_name = body.fullName.trim()
  if (typeof body?.avatarUrl === "string" || body?.avatarUrl === null) updates.avatar_url = body.avatarUrl
  if (body?.avatarConfig && typeof body.avatarConfig === "object") updates.avatar_config = body.avatarConfig

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No profile updates supplied." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", context.user.id)
    .select("id,email,full_name,name,primary_role,avatar_url,avatar_config,created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
