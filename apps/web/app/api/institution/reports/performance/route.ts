import { NextRequest, NextResponse } from "next/server"

import { getSessionWithRole } from "@/server/auth/session"
import { getStarterAnalytics, listStarterCourses, requireInstitutionRole } from "@/server/institution"

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value)
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const sessionWithRole = await getSessionWithRole()
  if (!sessionWithRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const context = await requireInstitutionRole(sessionWithRole.session.user.id, ["INSTITUTION_ADMIN", "EDUCATOR"])
  const requestedCourseId = request.nextUrl.searchParams.get("courseId")
  const view = request.nextUrl.searchParams.get("view") === "students" ? "students" : "attempts"
  const courses = await listStarterCourses(context)
  if (requestedCourseId && !courses.some((course) => course.id === requestedCourseId)) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 })
  }
  const analytics = await getStarterAnalytics(context, requestedCourseId)
  const scopeName = requestedCourseId
    ? courses.find((course) => course.id === requestedCourseId)?.name || "Class"
    : "All accessible classes"

  const csv = view === "students"
    ? [
      ["student_name", "student_email", "scope", "attempts", "average_score_percent", "assignments_assigned", "assignments_completed", "assignment_completion_percent", "last_active"].map(csvCell).join(","),
      ...analytics.students.map((student) => [student.name, student.email, scopeName, student.attempts, student.averageScore, student.assignmentsAssigned, student.assignmentsCompleted, student.assignmentCompletion, student.lastActive].map(csvCell).join(","))
    ].join("\n")
    : [
      ["student_name", "student_email", "class", "case_title", "case_id", "modality", "score_percent", "score_source", "correct", "duration_seconds", "assignment_id", "source", "completed_at"].map(csvCell).join(","),
      ...analytics.attempts.map((attempt) => [attempt.studentName, attempt.studentEmail, attempt.courseName, attempt.caseTitle, attempt.caseId, attempt.modality, attempt.score, attempt.scoreSource, attempt.isCorrect, attempt.durationSec, attempt.assignmentId, attempt.source, attempt.createdAt].map(csvCell).join(","))
    ].join("\n")
  const scope = requestedCourseId ? `class-${requestedCourseId}` : "institution"
  const filename = `medlab-${scope}-${view}.csv`
  return new NextResponse(`${csv}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store" } })
}
