import { NextResponse } from "next/server"

import { getServerSession } from "@/server/auth/session"
import { recordInstitutionAttempt } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function scoreDiagnosis(answer: string, expected: string) {
  const normalizedAnswer = normalize(answer)
  const normalizedExpected = normalize(expected)
  if (normalizedAnswer.includes(normalizedExpected)) return 100
  const ignored = new Set(["a", "an", "and", "of", "the", "with", "without", "acute", "likely"])
  const expectedTokens = Array.from(new Set(normalizedExpected.split(" ").filter((token) => token.length > 2 && !ignored.has(token))))
  const answerTokens = new Set(normalizedAnswer.split(" "))
  const matched = expectedTokens.filter((token) => answerTokens.has(token)).length
  return expectedTokens.length ? Math.min(95, Math.round((matched / expectedTokens.length) * 100)) : 0
}

export async function POST(request: Request, { params }: { params: { caseId: string } }) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (Number(request.headers.get("content-length") || 0) > 8192) return NextResponse.json({ error: "Request too large" }, { status: 413 })
  const body = await request.json().catch(() => null)
  const answer = String(body?.answer || "").trim()
  const courseId = String(body?.courseId || "")
  if (!answer || answer.length > 2000 || !courseId) return NextResponse.json({ error: "Answer and class context are required" }, { status: 400 })
  const { data: institutionCase } = await supabaseAdmin.from("institution_cases").select("id,institution_id,modality,correct_diagnosis,teaching_points,institutions!inner(billing_plan)").eq("id", params.caseId).eq("status", "PUBLISHED").eq("institutions.billing_plan", "ENTERPRISE").maybeSingle()
  if (!institutionCase) return NextResponse.json({ error: "Case not found" }, { status: 404 })
  const { data: courseMembership } = await supabaseAdmin.from("course_memberships").select("course_id,courses!inner(institution_id)").eq("course_id", courseId).eq("user_id", session.user.id).eq("role", "STUDENT").eq("status", "ACTIVE").eq("courses.institution_id", institutionCase.institution_id).maybeSingle()
  if (!courseMembership) return NextResponse.json({ error: "Class access denied" }, { status: 403 })
  const score = scoreDiagnosis(answer, String(institutionCase.correct_diagnosis))
  const durationSec = Number(body?.durationSec)
  await recordInstitutionAttempt({
    userId: session.user.id,
    caseId: `institution:${institutionCase.id}`,
    courseId,
    attemptId: body?.attemptId ? String(body.attemptId) : null,
    score,
    isCorrect: score >= 70,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    modality: String(institutionCase.modality),
    metadata: { scoreSource: "server_validated", authoredCaseId: String(institutionCase.id), source: "web" }
  })
  return NextResponse.json({ score, isCorrect: score >= 70, correctDiagnosis: String(institutionCase.correct_diagnosis), teachingPoints: Array.isArray(institutionCase.teaching_points) ? institutionCase.teaching_points.map(String) : [] }, { headers: { "cache-control": "private, no-store" } })
}
