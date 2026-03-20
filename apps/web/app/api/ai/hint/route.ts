import { NextRequest, NextResponse } from "next/server"
import { generateHintWithAI } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, context, previousAttempts, specialty, isFreeConsult } = body

    if (!question || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const hint = await generateHintWithAI(
      question,
      context,
      previousAttempts || [],
      specialty,
      isFreeConsult
    )

    return NextResponse.json({ hint })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    )
  }
}

