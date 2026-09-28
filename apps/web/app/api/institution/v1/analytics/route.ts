import { NextRequest, NextResponse } from "next/server"

import { authenticateEnterpriseApiKey, getStarterAnalytics } from "@/server/institution"
import type { InstitutionContext } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function boundedInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.max(0, Math.min(maximum, parsed)) : fallback
}

async function handleGet(request: NextRequest) {
  const authentication = await authenticateEnterpriseApiKey(request, "analytics:read")
  if (!authentication.ok) return NextResponse.json({ error: authentication.error }, { status: authentication.status, headers: { "cache-control": "no-store" } })
  const { data: institution } = await supabaseAdmin.from("institutions").select("*").eq("id", authentication.institutionId).maybeSingle()
  if (!institution) return NextResponse.json({ error: "Institution unavailable" }, { status: 404 })
  const limit = Math.max(1, boundedInteger(request.nextUrl.searchParams.get("limit"), 100, 500))
  const offset = boundedInteger(request.nextUrl.searchParams.get("offset"), 0, 5000)
  const courseId = request.nextUrl.searchParams.get("courseId")
  const context = { institution, membership: { institution_id: institution.id, user_id: authentication.keyId, role: "INSTITUTION_ADMIN", status: "ACTIVE", created_at: institution.created_at } } as InstitutionContext
  const analytics = await getStarterAnalytics(context, courseId)
  if (courseId && !analytics.courses.some((course) => course.id === courseId)) return NextResponse.json({ error: "Class not found" }, { status: 404 })
  return NextResponse.json({
    data: {
      courses: analytics.courses,
      students: analytics.students,
      daily: analytics.daily,
      weakestCases: analytics.weakestCases,
      attempts: analytics.attempts.slice(offset, offset + limit)
    },
    pagination: { limit, offset, returned: Math.min(limit, Math.max(0, analytics.attempts.length - offset)), totalAttempts: analytics.attempts.length }
  }, { headers: { "cache-control": "no-store", "x-ratelimit-limit": String(authentication.dailyLimit), "x-ratelimit-remaining": String(Math.max(0, authentication.dailyLimit - authentication.requestCount)) } })
}

export async function GET(request: NextRequest) {
  try {
    return await handleGet(request)
  } catch {
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500, headers: { "cache-control": "no-store" } })
  }
}
