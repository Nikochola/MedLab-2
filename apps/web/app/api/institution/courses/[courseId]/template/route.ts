import { NextResponse } from "next/server"

interface TemplateRouteContext {
  params: {
    courseId: string
  }
}

export async function GET(request: Request, _context: TemplateRouteContext) {
  const { searchParams } = new URL(request.url)
  const role = (searchParams.get("role") || "student").toLowerCase()

  const csv =
    role === "educator"
      ? "educator_email,educator_name\nexample.educator@university.edu,Dr Example\n"
      : "student_email,student_name,educator_name,educator_email\nexample.student@university.edu,Student Example,Dr Example,example.educator@university.edu\n"

  const filename = role === "educator" ? "educators_template.csv" : "students_template.csv"

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"${filename}\"`
    }
  })
}
