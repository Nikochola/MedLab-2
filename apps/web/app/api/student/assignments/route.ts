import { NextResponse } from "next/server"

import { STARTER_CASE_LIBRARY } from "@/server/institution"
import { getServerSession } from "@/server/auth/session"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("case_assignment_students")
    .select("status,completed_at,case_assignments!inner(id,institution_id,title,instructions,case_ids,due_at,status,course_id,courses(name))")
    .eq("student_user_id", session.user.id)
    .eq("case_assignments.status", "PUBLISHED")
    .order("assigned_at", { ascending: false })

  if (error) {
    const setupPending = error.code === "PGRST205" || error.message.includes("case_assignment_students")
    if (setupPending) {
      return NextResponse.json(
        { assignments: [], setupRequired: true },
        { headers: { "cache-control": "private, no-store" } }
      )
    }
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 })
  }
  const library = new Map(STARTER_CASE_LIBRARY.map((item) => [item.id, item]))
  const customIds = Array.from(new Set((data || []).flatMap((target) => {
    const assignment = (target as any).case_assignments
    return (Array.isArray(assignment?.case_ids) ? assignment.case_ids : [])
      .map(String)
      .filter((id: string) => id.startsWith("institution:"))
      .map((id: string) => id.slice("institution:".length))
  })))
  const { data: customCases } = customIds.length
    ? await supabaseAdmin.from("institution_cases").select("id,institution_id,title,modality,difficulty,duration_min").in("id", customIds).eq("status", "PUBLISHED")
    : { data: [] as Array<{ id: string; institution_id: string; title: string; modality: string; difficulty: string; duration_min: number }> }
  const customMap = new Map((customCases || []).map((item) => [`institution:${item.id}`, item]))
  const assignments = (data || []).map((target) => {
    const assignment = (target as any).case_assignments
    return {
      id: String(assignment.id),
      title: String(assignment.title),
      instructions: assignment.instructions ? String(assignment.instructions) : null,
      dueAt: assignment.due_at ? String(assignment.due_at) : null,
      courseName: assignment.courses?.name ? String(assignment.courses.name) : "Class",
      status: String(target.status),
      cases: (Array.isArray(assignment.case_ids) ? assignment.case_ids : []).map((id: unknown) => {
        const params = new URLSearchParams({ courseId: String(assignment.course_id), assignmentId: String(assignment.id) })
        const caseId = String(id)
        const item = library.get(caseId)
        if (item) return { ...item, href: `${item.href}?${params.toString()}` }
        const custom = customMap.get(caseId)
        if (!custom || String(custom.institution_id) !== String(assignment.institution_id)) return null
        return {
          id: caseId,
          title: String(custom.title),
          modality: String(custom.modality),
          difficulty: String(custom.difficulty),
          durationMin: Number(custom.duration_min),
          href: `/institution-cases/${custom.id}?${params.toString()}`
        }
      }).filter(Boolean)
    }
  })
  return NextResponse.json({ assignments })
}
