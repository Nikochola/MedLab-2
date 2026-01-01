import { NextRequest, NextResponse } from "next/server"
import { generateCaseFeedback } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentAssessment, patientCase, ecgFindings } = body

    if (!studentAssessment || !patientCase || !ecgFindings) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const feedback = await generateCaseFeedback(
      studentAssessment,
      patientCase,
      ecgFindings
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

