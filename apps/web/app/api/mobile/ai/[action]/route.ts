import { NextResponse } from "next/server"

import {
  generateCaseFeedback,
  generateHintWithAI,
  generateStepIntroduction,
  validateAnswerWithAI,
} from "@/lib/ai/aiClient"
import { authorizeMobileAiRequest } from "@/server/mobile/ai"
import { isMobileContext, requireMobileUser } from "@/server/mobile/auth"

const ACTIONS = new Set(["feedback", "hint", "intro", "validate"])

export async function POST(request: Request, { params }: { params: { action: string } }) {
  const action = params.action
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown AI action" }, { status: 404 })
  }

  const context = await requireMobileUser(request)
  if (!isMobileContext(context)) return context

  const access = await authorizeMobileAiRequest(context.user.id)
  if (!access.ok) return access.response

  const body = await request.json().catch(() => null)

  try {
    if (action === "validate") {
      const { studentAnswer, question, context: clinicalContext, correctAnswer, specialty } = body || {}
      if (!studentAnswer || !question || !clinicalContext) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      const result = await validateAnswerWithAI(studentAnswer, question, clinicalContext, correctAnswer, specialty)
      await access.commitUsage()
      return NextResponse.json(result)
    }

    if (action === "hint") {
      const { question, context: medicalContext, previousAttempts, specialty, isFreeConsult } = body || {}
      if (!question || !medicalContext) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      const hint = await generateHintWithAI(question, medicalContext, previousAttempts || [], specialty, isFreeConsult)
      await access.commitUsage()
      return NextResponse.json({ hint })
    }

    if (action === "intro") {
      const { step, context: clinicalContext, specialty } = body || {}
      if (!step || !clinicalContext) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      const introduction = await generateStepIntroduction(step, clinicalContext, specialty)
      await access.commitUsage()
      return NextResponse.json({ introduction })
    }

    const { studentAssessment, patientCase, findings, role } = body || {}
    if (!studentAssessment || !patientCase || !findings) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const feedback = await generateCaseFeedback(studentAssessment, patientCase, findings, role)
    await access.commitUsage()
    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("[mobile/ai]", error)
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 })
  }
}
