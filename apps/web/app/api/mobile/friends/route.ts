import { NextResponse } from "next/server"

import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"
import { supabaseAdmin } from "@/server/supabaseAdmin"

async function friendshipsFor(userId: string) {
  const { data } = await supabaseAdmin
    .from("friendships")
    .select("id,requester_id,addressee_id,status,created_at,updated_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("updated_at", { ascending: false })

  const rows = data || []
  const otherIds = rows.map((row: any) => row.requester_id === userId ? row.addressee_id : row.requester_id)
  const { data: profiles } = otherIds.length
    ? await supabaseAdmin.from("profiles").select("id,email,full_name,avatar_url,avatar_config").in("id", otherIds)
    : { data: [] as any[] }
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]))

  return rows.map((row: any) => ({
    ...row,
    profile: profileMap.get(row.requester_id === userId ? row.addressee_id : row.requester_id) || null,
  }))
}

export async function GET(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  return NextResponse.json({ friendships: await friendshipsFor(context.user.id) })
}

export async function POST(request: Request) {
  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const body = await request.json().catch(() => null)
  const action = String(body?.action || "")

  if (action === "search") {
    const query = String(body?.query || "").trim()
    if (query.length < 2) return NextResponse.json({ results: [] })
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,avatar_url,avatar_config")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq("id", context.user.id)
      .limit(10)
    return NextResponse.json({ results: data || [] })
  }

  if (action === "request") {
    const addresseeId = String(body?.userId || "")
    if (!addresseeId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    const { error } = await supabaseAdmin.from("friendships").upsert({
      requester_id: context.user.id,
      addressee_id: addresseeId,
      status: "pending",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ friendships: await friendshipsFor(context.user.id) })
  }

  if (action === "accept") {
    const friendshipId = String(body?.friendshipId || "")
    const { error } = await supabaseAdmin
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId)
      .eq("addressee_id", context.user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ friendships: await friendshipsFor(context.user.id) })
  }

  if (action === "remove") {
    const friendshipId = String(body?.friendshipId || "")
    const { error } = await supabaseAdmin
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .or(`requester_id.eq.${context.user.id},addressee_id.eq.${context.user.id}`)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ friendships: await friendshipsFor(context.user.id) })
  }

  return NextResponse.json({ error: "Unknown friends action" }, { status: 400 })
}
