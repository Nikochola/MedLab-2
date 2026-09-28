import { NextRequest, NextResponse } from "next/server"

import { authenticateEnterpriseApiKey } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function boundedInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.max(0, Math.min(maximum, parsed)) : fallback
}

async function handleGet(request: NextRequest) {
  const authentication = await authenticateEnterpriseApiKey(request, "roster:read")
  if (!authentication.ok) return NextResponse.json({ error: authentication.error }, { status: authentication.status, headers: { "cache-control": "no-store" } })
  const limit = Math.max(1, boundedInteger(request.nextUrl.searchParams.get("limit"), 100, 500))
  const offset = boundedInteger(request.nextUrl.searchParams.get("offset"), 0, 10_000)
  const courseId = request.nextUrl.searchParams.get("courseId")
  let courseQuery = supabaseAdmin.from("courses").select("id,name").eq("institution_id", authentication.institutionId).eq("is_archived", false)
  if (courseId) courseQuery = courseQuery.eq("id", courseId)
  const { data: courses } = await courseQuery
  if (courseId && !courses?.length) return NextResponse.json({ error: "Class not found" }, { status: 404 })
  const courseIds = (courses || []).map((course) => String(course.id))
  if (!courseIds.length) return NextResponse.json({ data: [], pagination: { limit, offset, returned: 0 } }, { headers: { "cache-control": "no-store" } })
  const { data: memberships, error, count } = await supabaseAdmin.from("course_memberships").select("course_id,user_id,role,status,created_at", { count: "exact" }).in("course_id", courseIds).order("created_at", { ascending: true }).range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: "Roster unavailable" }, { status: 500 })
  const userIds = Array.from(new Set((memberships || []).map((membership) => String(membership.user_id))))
  const { data: profiles } = userIds.length ? await supabaseAdmin.from("profiles").select("id,email,full_name").in("id", userIds) : { data: [] as any[] }
  const profileMap = new Map((profiles || []).map((profile) => [String(profile.id), profile]))
  const courseMap = new Map((courses || []).map((course) => [String(course.id), String(course.name)]))
  return NextResponse.json({
    data: (memberships || []).map((membership) => ({
      userId: String(membership.user_id),
      name: profileMap.get(String(membership.user_id))?.full_name || null,
      email: profileMap.get(String(membership.user_id))?.email || "",
      role: String(membership.role), status: String(membership.status),
      courseId: String(membership.course_id), courseName: courseMap.get(String(membership.course_id)) || "Class",
      joinedAt: String(membership.created_at)
    })),
    pagination: { limit, offset, returned: (memberships || []).length, total: count || 0 }
  }, { headers: { "cache-control": "no-store", "x-ratelimit-limit": String(authentication.dailyLimit), "x-ratelimit-remaining": String(Math.max(0, authentication.dailyLimit - authentication.requestCount)) } })
}

export async function GET(request: NextRequest) {
  try {
    return await handleGet(request)
  } catch {
    return NextResponse.json({ error: "Roster unavailable" }, { status: 500, headers: { "cache-control": "no-store" } })
  }
}
