import { NextRequest, NextResponse } from "next/server"
import { generateCaseFeedback } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    )
  }
}

