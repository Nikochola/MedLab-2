import { NextRequest, NextResponse } from "next/server"
import { generateHintWithAI } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, ecgContext, previousAttempts } = body

    if (!question || !ecgContext) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const hint = await generateHintWithAI(
      question,
      ecgContext,
      previousAttempts || []
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

