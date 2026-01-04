import { InterpretationStep } from "../constants"
import { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import { validateAnswer } from "../answerValidation"
import { validateAnswerWithAI } from "./aiClient"

export interface AnswerValidationResult {
  isCorrect: boolean
  message: string
  explanation?: string
}

export async function validateAnswerWithAIEnhanced(
  step: InterpretationStep,
  answer: string,
  ecgParams: ECGWaveformParams,
  useAI: boolean = true
): Promise<AnswerValidationResult> {
  // Always try AI first if enabled, fallback to rule-based
  if (useAI) {
    try {
      const ecgContext = buildECGContext(ecgParams)
      const question = getQuestionForStep(step)
      const correctAnswer = getExpectedAnswer(step, ecgParams)
      
      const aiResult = await validateAnswerWithAI(
        answer,
        question,
        ecgContext,
        correctAnswer
      )
      
      return {
        isCorrect: aiResult.isCorrect,
        message: aiResult.feedback,
        explanation: aiResult.explanation,
      }
    } catch (error) {
      console.error("AI validation failed, falling back to rule-based:", error)
      // Fall through to rule-based validation
    }
  }
  
  // Fallback to rule-based validation
  const ruleBasedResult = validateAnswer(step, answer, ecgParams)
  return {
    isCorrect: ruleBasedResult.isCorrect,
    message: ruleBasedResult.message,
  }
}

function buildECGContext(params: ECGWaveformParams): string {
  const context: string[] = []
  
  if (params.heartRate) {
    context.push(`Heart rate: approximately ${params.heartRate} bpm`)
  }
  
  if (params.rhythm) {
    context.push(`Rhythm: ${params.rhythm}`)
  }
  
  if (params.abnormalities) {
    const abn: string[] = []
    if (params.abnormalities.stElevation) abn.push("ST elevation")
    if (params.abnormalities.stDepression) abn.push("ST depression")
    if (params.abnormalities.qWaves) abn.push("Pathologic Q waves")
    if (params.abnormalities.tWaveInversion) abn.push("T wave inversion")
    if (params.abnormalities.leftAxis) abn.push("Left axis deviation")
    if (params.abnormalities.rightAxis) abn.push("Right axis deviation")
    
    if (abn.length > 0) {
      context.push(`Abnormalities: ${abn.join(", ")}`)
    } else {
      context.push("No significant abnormalities detected")
    }
  }
  
  return `This is a 12-lead ECG. ${context.join(". ")}.`
}

function getQuestionForStep(step: InterpretationStep): string {
  const questions: Record<InterpretationStep, string> = {
    "heart-rate": "What is the heart rate of this ECG?",
    "rhythm": "What is the rhythm of this ECG?",
    "p-wave": "Describe the P-waves",
    "pr-interval": "What is the PR interval in milliseconds?",
    "qrs-duration": "What is the QRS duration in milliseconds?",
    "axis": "What is the electrical axis?",
    "st-t": "Are there any ST-T segment abnormalities?",
  }
  return questions[step]
}

function getExpectedAnswer(step: InterpretationStep, params: ECGWaveformParams): string {
  switch (step) {
    case "heart-rate":
      return `${params.heartRate || 75} bpm`
    case "rhythm":
      return params.rhythm ? params.rhythm.split("-").join(" ") : "sinus regular"
    case "axis":
      if (params.abnormalities?.leftAxis) return "Left axis deviation"
      if (params.abnormalities?.rightAxis) return "Right axis deviation"
      return "Normal axis"
    default:
      return ""
  }
}
