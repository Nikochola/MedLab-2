import { NextRequest, NextResponse } from "next/server"
import { generateHintWithAI } from "@/lib/ai/aiClient"
import { authorizeAiRequest } from "@/lib/ai/guard"

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAiRequest()
    if (!access.ok) return access.response

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

    await access.commitUsage()

    return NextResponse.json({ hint })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    )
  }
}

