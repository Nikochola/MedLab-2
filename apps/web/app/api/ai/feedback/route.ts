import { NextRequest, NextResponse } from "next/server"
import { generateCaseFeedback } from "@/lib/ai/aiClient"
import { authorizeAiRequest } from "@/lib/ai/guard"

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAiRequest()
    if (!access.ok) return access.response

    const body = await request.json()
    const { studentAssessment, patientCase, findings, role } = body

    if (!studentAssessment || !patientCase || !findings) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const feedback = await generateCaseFeedback(
      studentAssessment,
      patientCase,
      findings,
      role
    )

    await access.commitUsage()

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    )
  }
}

