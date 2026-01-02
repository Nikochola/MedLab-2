import { NextResponse } from "next/server"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer"

export async function POST(req: Request) {
  try {
    const { studentId, classroomId } = await req.json()

    if (!studentId || !classroomId) {
      return NextResponse.json({ error: "Missing studentId or classroomId" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: classroom } = await supabase
      .from("classrooms")
      .select("id, teacher_id")
      .eq("id", classroomId)
      .maybeSingle()
    if (!classroom || classroom.teacher_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createSupabaseAdminClient()
    await admin.from("users").update({ classroom_id: null }).eq("id", studentId).eq("classroom_id", classroomId)
    await admin
      .from("student_progress")
      .update({ classroom_id: null })
      .eq("student_id", studentId)
      .eq("classroom_id", classroomId)
    await admin
      .from("student_activities")
      .update({ classroom_id: null })
      .eq("student_id", studentId)
      .eq("classroom_id", classroomId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("remove-student error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
