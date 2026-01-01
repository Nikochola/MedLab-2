import { NextRequest, NextResponse } from "next/server"
import { validateAnswerWithAI } from "@/lib/ai/aiClient"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentAnswer, question, ecgContext, correctAnswer } = body

    if (!studentAnswer || !question || !ecgContext) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await validateAnswerWithAI(
      studentAnswer,
      question,
      ecgContext,
      correctAnswer
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to validate answer with AI" },
      { status: 500 }
    )
  }
}

