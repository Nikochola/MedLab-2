import { NextRequest, NextResponse } from "next/server"
import { validateAnswerWithAI } from "@/lib/ai/aiClient"
import { authorizeAiRequest } from "@/lib/ai/guard"

export async function POST(request: NextRequest) {
  try {
    const access = await authorizeAiRequest()
    if (!access.ok) return access.response

    const body = await request.json()
    const { studentAnswer, question, context, correctAnswer, specialty } = body

    if (!studentAnswer || !question || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await validateAnswerWithAI(
      studentAnswer,
      question,
      context,
      correctAnswer,
      specialty
    )

    await access.commitUsage()

    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to validate answer with AI" },
      { status: 500 }
    )
  }
}

