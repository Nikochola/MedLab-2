import { GoogleGenerativeAI } from "@google/generative-ai"
import { ECGWaveformParams, generateRandomECGParams } from "@/components/ecg/ECGWaveformGenerator"

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDLH1-ERuE38M6rSisIqU3voZfLNUmw2_A"

export const genAI = new GoogleGenerativeAI(API_KEY)

export type CaseFeedbackResource = {
  title: string
  url?: string
  whyItMatters?: string
}

export type CaseFeedback = {
  strengths: string[]
  corrections: string[]
  improvements: string[]
  resources: CaseFeedbackResource[]
  summary: string
}

export type ECGPromptResult = {
  params: ECGWaveformParams
  source: "json" | "ai" | "rule-based" | "random"
}

type StructuredAssessment = {
  rate?: string
  rhythm?: string
  prInterval?: string
  qrsInterval?: string
  qtInterval?: string
  axis?: string
  chamberEnlargement?: Record<string, boolean>
  waveformAbnormalities?: Record<string, boolean>
  diagnosis?: string
}

export async function generateAIResponse(prompt: string, model: string = "gemini-1.5-flash") {
  try {
    const model_instance = genAI.getGenerativeModel({ model })
    const result = await model_instance.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error("Error generating AI response:", error)
    throw error
  }
}

export async function validateAnswerWithAI(
  studentAnswer: string,
  question: string,
  ecgContext: string,
  correctAnswer?: string
): Promise<{
  isCorrect: boolean
  feedback: string
  explanation: string
}> {
  const numericAnswer = extractFirstNumber(studentAnswer)
  const allowShortNumeric = numericAnswer !== null && questionExpectsNumeric(question)

  const prompt = `You are an expert medical educator specializing in ECG interpretation. 

Context: ${ecgContext}
Question: ${question}
Student's Answer: ${studentAnswer}
${correctAnswer ? `Expected Answer (for reference): ${correctAnswer}` : ""}

Please evaluate the student's answer:
1. Determine if the answer is correct (be flexible with terminology - synonyms and alternative phrasings should be accepted if medically accurate)
2. Provide constructive feedback
3. Give a brief educational explanation

Format your response as JSON:
{
  "isCorrect": true/false,
  "feedback": "Brief feedback message",
  "explanation": "Educational explanation about the concept"
}

Be encouraging and educational. If the answer is partially correct, acknowledge what's right and guide them to the complete answer.
If the student's answer is clearly too short or nonsensical, mark it incorrect and ask for a meaningful ECG interpretation.`

  try {
    if (!allowShortNumeric && isLowQualityAnswer(studentAnswer)) {
      return {
        isCorrect: false,
        feedback: "Your answer is too short to evaluate. Please provide a meaningful ECG interpretation.",
        explanation: "Try using standard ECG terminology (e.g., rhythm, axis, ST-T changes) so I can assess it accurately.",
      }
    }
    const response = await generateAIResponse(prompt)
    // Parse JSON from response (might have markdown formatting)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const isCorrect = Boolean(parsed.isCorrect)
      const feedback = parsed.feedback || "Thank you for your answer."
      const explanation = parsed.explanation || ""
      if (isCorrect && !allowShortNumeric && isLowQualityAnswer(studentAnswer)) {
        return {
          isCorrect: false,
          feedback: "Your answer is too short to evaluate. Please provide a meaningful ECG interpretation.",
          explanation: "Use specific ECG terms (rate, rhythm, axis, ST-T changes) to support your answer.",
        }
      }
      const hasReferenceAnswer = Boolean(correctAnswer && correctAnswer.trim().length > 0)
      if (isCorrect && hasReferenceAnswer && !answerMatchesContext(studentAnswer, correctAnswer, ecgContext)) {
        return {
          isCorrect: false,
          feedback: "Your answer doesn't match the ECG context. Please reference key findings (rate, rhythm, axis, ST-T changes).",
          explanation: "Re-check the ECG and include specific terms that support your interpretation.",
        }
      }
      return {
        isCorrect,
        feedback,
        explanation,
      }
    }
    // Fallback if JSON parsing fails
    return {
      isCorrect: false,
      feedback: response.substring(0, 200),
      explanation: response,
    }
  } catch (error) {
    console.error("AI validation error:", error)
    throw error
  }
}

export async function generateHintWithAI(
  question: string,
  ecgContext: string,
  previousAttempts: string[]
): Promise<string> {
  const prompt = `You are an expert medical educator. A student is struggling with this ECG interpretation question:

Question: ${question}
ECG Context: ${ecgContext}
Previous incorrect attempts: ${previousAttempts.join(", ") || "None yet"}

Provide a helpful, educational hint that guides them toward the correct answer without giving it away. Be encouraging and focus on what they should look for or think about.

Keep the hint concise (2-3 sentences maximum).`

  try {
    const response = await generateAIResponse(prompt)
    return response.trim()
  } catch (error) {
    console.error("AI hint generation error:", error)
    return "Look carefully at the ECG patterns and measurements. Consider reviewing the relevant concepts."
  }
}

// ... existing code ...

export async function generateCaseFeedback(
  studentAssessment: string,
  patientCase: string,
  ecgFindings: string
): Promise<CaseFeedback> {
  const structuredAssessment = parseStructuredAssessment(studentAssessment)
  if (structuredAssessment && isLowQualityAssessment(structuredAssessment)) {
    return buildRuleBasedFeedback(structuredAssessment)
  }

  const prompt = `You are an expert cardiologist reviewing a medical student's ECG interpretation.

Patient Case (student saw this): ${patientCase}
ECG Findings (provided to student): ${ecgFindings}

Student's structured assessment (use this as the source of truth):
${studentAssessment}

Provide feedback that DIRECTLY references the student's specific entries (rate, rhythm, intervals, axis, hypertrophy/atrial findings, waveform abnormalities, final diagnosis). Highlight correct measurements/interpretations and point out any mismatches with typical ECG norms or likely diagnoses. Do not invent findings that are not in the student's assessment.
Your feedback MUST be derived from what the student wrote. Call out weak or incorrect diagnosis statements and explain what they should have said based on the ECG context.
If any section is blank, too short, or nonsensical, call it out explicitly in corrections and improvements.
When there are missing or weak sections, include at least 2 corrections and 2 improvements with actionable guidance.

Return ONLY valid JSON with this shape:
{
  "strengths": ["...bullet points of what they got right..."],
  "corrections": ["...specific mistakes or misses, tied to their entries..."],
  "improvements": ["...actionable coaching items tied to their approach..."],
  "resources": [
    {
      "title": "Concise resource name",
      "url": "https://credible-source.example",
      "whyItMatters": "One sentence on how this helps"
    }
  ],
  "summary": "2-3 sentence overall assessment with encouragement"
}
Rules:
- Keep bullets concise and clinically precise.
- Prefer reputable resources (AHA, ESC, peer-reviewed texts).
- If unsure about a section, return an empty array for it.
- Do not include any markdown or prose outside of the JSON.`

  try {
    const response = await generateAIResponse(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const aiFeedback: CaseFeedback = {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        resources: Array.isArray(parsed.resources)
          ? parsed.resources.map((resource: CaseFeedbackResource) => ({
              title: resource.title || "Suggested reading",
              url: resource.url,
              whyItMatters: resource.whyItMatters,
            }))
          : [],
        summary: typeof parsed.summary === "string"
          ? parsed.summary
          : "Review the ECG details and compare with guideline-based interpretations.",
      }

      const hasContent =
        aiFeedback.strengths.length ||
        aiFeedback.corrections.length ||
        aiFeedback.improvements.length ||
        aiFeedback.resources.length ||
        (aiFeedback.summary && aiFeedback.summary.trim().length > 0)

      if (!hasContent && structuredAssessment) {
        return buildRuleBasedFeedback(structuredAssessment)
      }

      return aiFeedback
    }

    if (structuredAssessment) {
      return buildRuleBasedFeedback(structuredAssessment)
    }

    return getGenericFallback()
  } catch (error) {
    console.error("AI case feedback error:", error)
    if (structuredAssessment) {
      return buildRuleBasedFeedback(structuredAssessment)
    }
    return getGenericFallback()
  }
}

export async function generateECGParamsFromPrompt(prompt: string): Promise<ECGPromptResult> {
  const jsonParams = parseParamsFromJSON(prompt)
  if (hasMeaningfulParams(jsonParams)) {
    return { params: applyECGDefaults(jsonParams), source: "json" }
  }

  const aiParams = await generateParamsWithAI(prompt)
  if (hasMeaningfulParams(aiParams)) {
    return { params: applyECGDefaults(aiParams), source: "ai" }
  }

  const ruleParams = parseParamsRuleBased(prompt)
  if (hasMeaningfulParams(ruleParams)) {
    return { params: applyECGDefaults(ruleParams), source: "rule-based" }
  }

  return { params: applyECGDefaults(generateRandomECGParams()), source: "random" }
}

function parseStructuredAssessment(studentAssessment: string): StructuredAssessment | null {
  try {
    const parsed = JSON.parse(studentAssessment)
    if (typeof parsed === "object") {
      return parsed as StructuredAssessment
    }
    return null
  } catch {
    return null
  }
}

function buildRuleBasedFeedback(assessment: StructuredAssessment): CaseFeedback {
  const strengths: string[] = []
  const corrections: string[] = []
  const improvements: string[] = []

  // Rate
  const rateNum = Number(assessment.rate)
  if (!Number.isNaN(rateNum)) {
    if (rateNum >= 60 && rateNum <= 100) {
      strengths.push(`Heart rate ${rateNum} bpm sits in the normal range.`)
    } else if (rateNum < 60) {
      corrections.push(`Heart rate ${rateNum} bpm suggests bradycardia—reconcile with your rhythm call.`)
    } else if (rateNum > 100) {
      corrections.push(`Heart rate ${rateNum} bpm suggests tachycardia—ensure rhythm interpretation aligns.`)
    }
  } else {
    improvements.push("Include a measured heart rate to anchor your interpretation.")
  }

  // Rhythm
  if (isMeaningfulEntry(assessment.rhythm)) {
    strengths.push(`Documented rhythm: ${assessment.rhythm?.trim()}.`)
  } else {
    improvements.push("State the rhythm explicitly (e.g., NSR, AF with RVR).")
  }

  // PR
  const pr = Number(assessment.prInterval)
  if (!Number.isNaN(pr)) {
    if (pr >= 120 && pr <= 200) {
      strengths.push(`PR interval ${pr} ms is within normal limits.`)
    } else if (pr > 200) {
      corrections.push(`PR interval ${pr} ms is prolonged—consider first-degree AV block.`)
    } else if (pr > 0) {
      corrections.push(`PR interval ${pr} ms is short—consider pre-excitation or junctional rhythm.`)
    }
  }

  // QRS
  const qrs = Number(assessment.qrsInterval)
  if (!Number.isNaN(qrs)) {
    if (qrs < 120) {
      strengths.push(`QRS duration ${qrs} ms is narrow (normal).`)
    } else {
      corrections.push(`QRS duration ${qrs} ms is wide—consider BBB or ventricular origin.`)
    }
  }

  // QT
  const qt = Number(assessment.qtInterval)
  if (!Number.isNaN(qt)) {
    if (qt > 460) {
      corrections.push(`QT interval ${qt} ms appears prolonged—assess QTc and meds/electrolytes.`)
    } else {
      strengths.push(`QT interval ${qt} ms is not clearly prolonged in this context.`)
    }
  }

  // Axis
  if (isMeaningfulEntry(assessment.axis)) {
    if (assessment.axis === "normal") strengths.push("Axis reported as normal.")
    if (assessment.axis === "left") corrections.push("Left axis deviation noted—correlate with possible LAFB or LVH.")
    if (assessment.axis === "right") corrections.push("Right axis deviation noted—consider RV strain, PE, or RAD pattern.")
  } else {
    improvements.push("Include frontal plane axis to support your diagnosis.")
  }

  // Hypertrophy / atrial changes
  const chambers = assessment.chamberEnlargement || {}
  const chamberFlags = Object.entries(chambers).filter(([, v]) => v)
  if (chamberFlags.length) {
    strengths.push(
      `You flagged chamber changes: ${chamberFlags
        .map(([k]) => k.toUpperCase())
        .join(", ")}—be sure criteria support each call.`
    )
  }

  // Waveforms
  const waves = assessment.waveformAbnormalities || {}
  const waveFlags = Object.entries(waves).filter(([, v]) => v)
  if (waveFlags.length) {
    strengths.push(
      `Waveform abnormalities noted: ${waveFlags
        .map(([k]) => k.replace(/([A-Z])/g, " $1"))
        .join(", ")}—tie these to the clinical impression.`
    )
  }

  // Diagnosis
  if (isMeaningfulEntry(assessment.diagnosis)) {
    strengths.push(`Provided a working diagnosis: ${assessment.diagnosis?.trim()}.`)
  } else {
    improvements.push("State a synthesis/diagnosis tying rate, rhythm, intervals, and ST-T changes together.")
  }

  if (improvements.length === 0) {
    improvements.push(...generateDefaultImprovements(assessment))
  }

  const resources: CaseFeedbackResource[] = [
    {
      title: "ACC/AHA ECG interpretation basics",
      url: "https://www.acc.org/latest-in-cardiology/articles/2019/08/20/11/06/understanding-and-interpreting-the-ecg",
      whyItMatters: "Concise review of core intervals, axis, and hypertrophy criteria.",
    },
    {
      title: "Life in the Fast Lane ECG Library",
      url: "https://litfl.com/ecg-library/",
      whyItMatters: "High-yield examples of common rhythm and interval patterns.",
    },
  ]

  const summary =
    strengths.length || corrections.length
      ? "Rule-based feedback provided because AI response was empty. Review intervals, axis, and waveforms against your diagnosis."
      : "Add measurements and a diagnosis to receive targeted feedback."

  return {
    strengths,
    corrections,
    improvements,
    resources,
    summary,
  }
}

function generateDefaultImprovements(assessment: StructuredAssessment): string[] {
  const ideas: string[] = []
  if (assessment.axis) {
    ideas.push("Link your axis call to chamber findings (e.g., LAD + LVH criteria vs. RAD + RV strain).")
  }
  if (assessment.waveformAbnormalities && Object.values(assessment.waveformAbnormalities).some(Boolean)) {
    ideas.push("Tie each ST-T/Q wave change to a likely territory or differential and state why.")
  }
  if (assessment.prInterval || assessment.qrsInterval || assessment.qtInterval) {
    ideas.push("Compare PR/QRS/QT values against normal ranges and note clinical implications in one sentence each.")
  }
  if (assessment.diagnosis) {
    ideas.push("Back up your diagnosis with two concrete ECG findings (rate/rhythm/intervals or ST-T changes).")
  } else {
    ideas.push("Provide a working diagnosis and rank 1-2 differentials based on the tracings.")
  }
  if (!ideas.length) {
    ideas.push("Summarize the top ECG abnormality, cite the supporting measurements, and name a likely diagnosis.")
  }
  return ideas
}

function getGenericFallback(): CaseFeedback {
  return {
    strengths: [],
    corrections: [],
    improvements: ["Summarize the main ECG abnormality, cite key measurements (PR/QRS/QT, axis, ST-T), and state a likely diagnosis with one-line reasoning."],
    resources: [],
    summary: "Unable to generate detailed feedback right now. Try again in a moment.",
  }
}

const medicalKeywords = [
  "nsr",
  "sinus",
  "af",
  "afib",
  "a-fib",
  "vf",
  "vt",
  "svt",
  "brady",
  "tachy",
  "stemi",
  "nstemi",
  "st elevation",
  "st depression",
  "lad",
  "rad",
  "bbb",
  "rbbb",
  "lbbb",
  "block",
  "axis",
  "rhythm",
]

function hasMedicalKeyword(answer: string) {
  const normalized = answer.toLowerCase()
  return medicalKeywords.some((keyword) => normalized.includes(keyword))
}

function isLowQualityAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase()
  if (!normalized) return true
  const cleaned = normalized.replace(/[^a-z0-9]/g, "")
  if (!cleaned) return true
  if (/^(.)\\1+$/.test(cleaned)) return true
  if (cleaned.length < 3) {
    return !hasMedicalKeyword(normalized)
  }
  if (cleaned.length < 5 && !hasMedicalKeyword(normalized)) {
    return true
  }
  return false
}

function extractKeywords(value?: string | null) {
  if (!value) return []
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, " ")
    .split(/\\s+/)
    .filter((token) => token.length >= 3)
}

function answerMatchesContext(answer: string, correctAnswer?: string, ecgContext?: string) {
  const numericAnswer = extractFirstNumber(answer)
  if (numericAnswer !== null) {
    const numericTargets = [
      ...extractNumbers(correctAnswer),
      ...extractNumbers(ecgContext),
    ]
    if (numericTargets.some((target) => Math.abs(target - numericAnswer) <= 10)) {
      return true
    }
  }

  const normalized = answer.toLowerCase()
  if (hasMedicalKeyword(normalized)) return true

  const expectedTokens = new Set([
    ...extractKeywords(correctAnswer),
    ...extractKeywords(ecgContext),
  ])
  if (expectedTokens.size === 0) return true

  return Array.from(expectedTokens).some((token) => normalized.includes(token))
}

function isMeaningfulEntry(value?: string | null) {
  if (!value) return false
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.length < 3) return false
  if (/^(.)\\1+$/.test(normalized.replace(/\\s+/g, ""))) return false
  return true
}

function extractFirstNumber(value: string) {
  const match = value.match(/\\d+(?:\\.\\d+)?/)
  if (!match) return null
  const numberValue = Number(match[0])
  return Number.isNaN(numberValue) ? null : numberValue
}

function extractNumbers(value?: string | null) {
  if (!value) return []
  const matches = value.match(/\\d+(?:\\.\\d+)?/g) ?? []
  return matches
    .map((match) => Number(match))
    .filter((num) => !Number.isNaN(num))
}

function questionExpectsNumeric(question: string) {
  const normalized = question.toLowerCase()
  return [
    "heart rate",
    "rate",
    "bpm",
    "pr interval",
    "qrs",
    "qt interval",
    "interval",
    "ms",
  ].some((token) => normalized.includes(token))
}

function isLowQualityAssessment(assessment: StructuredAssessment) {
  const textFields = [
    assessment.rate,
    assessment.rhythm,
    assessment.prInterval,
    assessment.qrsInterval,
    assessment.qtInterval,
    assessment.axis,
    assessment.diagnosis,
  ]
  const meaningfulCount = textFields.filter((value) => isMeaningfulEntry(value)).length
  const hasWaveformFlags = assessment.waveformAbnormalities
    ? Object.values(assessment.waveformAbnormalities).some(Boolean)
    : false
  const hasChamberFlags = assessment.chamberEnlargement
    ? Object.values(assessment.chamberEnlargement).some(Boolean)
    : false

  return meaningfulCount < 2 && !hasWaveformFlags && !hasChamberFlags
}

const RHYTHM_OPTIONS: ECGWaveformParams["rhythm"][] = [
  "sinus-regular",
  "sinus-irregular",
  "non-sinus-regular",
  "non-sinus-irregular",
]

function applyECGDefaults(params: ECGWaveformParams): ECGWaveformParams {
  const rhythm = params.rhythm ?? "sinus-regular"
  const prIntervalMs =
    params.prIntervalMs ?? (rhythm.startsWith("sinus") ? 160 : 0)

  const abnormalities = params.abnormalities ?? {}
  if (abnormalities.leftAxis && abnormalities.rightAxis) {
    abnormalities.rightAxis = false
  }

  return {
    heartRate: params.heartRate ?? 75,
    rhythm,
    prIntervalMs,
    qrsDurationMs: params.qrsDurationMs ?? 90,
    duration: 10,
    sampleRate: 500,
    abnormalities,
  }
}

function hasMeaningfulParams(params: ECGWaveformParams | null): params is ECGWaveformParams {
  if (!params) return false
  return (
    typeof params.heartRate === "number" ||
    typeof params.rhythm === "string" ||
    typeof params.prIntervalMs === "number" ||
    typeof params.qrsDurationMs === "number" ||
    (params.abnormalities ? Object.values(params.abnormalities).some(Boolean) : false)
  )
}

function sanitizeParams(input: any): ECGWaveformParams {
  const params: ECGWaveformParams = {}
  if (!input || typeof input !== "object") return params

  if (Number.isFinite(input.heartRate)) {
    params.heartRate = clampNumber(Number(input.heartRate), 30, 200)
  }

  if (typeof input.rhythm === "string" && RHYTHM_OPTIONS.includes(input.rhythm as ECGWaveformParams["rhythm"])) {
    params.rhythm = input.rhythm as ECGWaveformParams["rhythm"]
  }

  if (Number.isFinite(input.prIntervalMs)) {
    params.prIntervalMs = clampNumber(Number(input.prIntervalMs), 80, 320)
  }

  if (Number.isFinite(input.qrsDurationMs)) {
    params.qrsDurationMs = clampNumber(Number(input.qrsDurationMs), 60, 200)
  }

  if (input.abnormalities && typeof input.abnormalities === "object") {
    params.abnormalities = {
      stElevation: Boolean(input.abnormalities.stElevation),
      stDepression: Boolean(input.abnormalities.stDepression),
      qWaves: Boolean(input.abnormalities.qWaves),
      tWaveInversion: Boolean(input.abnormalities.tWaveInversion),
      leftAxis: Boolean(input.abnormalities.leftAxis),
      rightAxis: Boolean(input.abnormalities.rightAxis),
    }
  }

  return params
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function parseParamsFromJSON(prompt: string): ECGWaveformParams | null {
  const match = prompt.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return sanitizeParams(parsed)
  } catch {
    return null
  }
}

async function generateParamsWithAI(prompt: string): Promise<ECGWaveformParams | null> {
  const aiPrompt = `You are converting a teacher's ECG request into parameters for a synthetic ECG generator.

Return ONLY valid JSON with this exact shape (omit any fields you are unsure about):
{
  "heartRate": 75,
  "rhythm": "sinus-regular" | "sinus-irregular" | "non-sinus-regular" | "non-sinus-irregular",
  "prIntervalMs": 160,
  "qrsDurationMs": 90,
  "abnormalities": {
    "stElevation": true/false,
    "stDepression": true/false,
    "qWaves": true/false,
    "tWaveInversion": true/false,
    "leftAxis": true/false,
    "rightAxis": true/false
  }
}

Guidance:
- STEMI or acute MI -> stElevation true
- Ischemia/NSTEMI -> stDepression true (often tWaveInversion true)
- Old MI -> qWaves true
- Atrial fibrillation -> rhythm non-sinus-irregular, HR 110-140
- SVT/atrial flutter -> rhythm non-sinus-regular, HR 140-180
- Sinus bradycardia -> rhythm sinus-regular, HR 45-60
- Sinus tachycardia -> rhythm sinus-regular, HR 100-130
- Left/right axis deviation -> set leftAxis/rightAxis true

Teacher prompt: ${prompt}`

  try {
    const response = await generateAIResponse(aiPrompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    return sanitizeParams(parsed)
  } catch (error) {
    console.error("AI ECG parameter generation failed:", error)
    return null
  }
}

function parseParamsRuleBased(prompt: string): ECGWaveformParams | null {
  const text = prompt.trim().toLowerCase()
  if (!text) return null

  const params: ECGWaveformParams = {}
  const abnormalities: NonNullable<ECGWaveformParams["abnormalities"]> = {}

  const hrMatch = text.match(/(?:\bhr\b|heart rate|rate)\s*[:=]?\s*(\d{2,3})/)
    ?? text.match(/(\d{2,3})\s*(?:bpm|beats per minute)/)
  if (hrMatch) {
    params.heartRate = clampNumber(Number(hrMatch[1]), 30, 200)
  }

  const prMatch = text.match(/\bpr\b\s*[:=]?\s*(\d{2,3})\s*ms/) ?? text.match(/pr interval\s*(\d{2,3})/)
  if (prMatch) {
    params.prIntervalMs = clampNumber(Number(prMatch[1]), 80, 320)
  }

  const qrsMatch = text.match(/\bqrs\b\s*[:=]?\s*(\d{2,3})\s*ms/) ?? text.match(/qrs duration\s*(\d{2,3})/)
  if (qrsMatch) {
    params.qrsDurationMs = clampNumber(Number(qrsMatch[1]), 60, 200)
  }

  if (text.includes("sinus")) {
    params.rhythm = text.includes("irregular") ? "sinus-irregular" : "sinus-regular"
  }

  if (text.includes("atrial fibrillation") || text.includes("afib") || text.includes("a-fib")) {
    params.rhythm = "non-sinus-irregular"
    if (!params.heartRate) params.heartRate = 130
  }

  if (text.includes("atrial flutter") || text.includes("flutter")) {
    params.rhythm = "non-sinus-regular"
    if (!params.heartRate) params.heartRate = 150
  }

  if (text.includes("svt") || text.includes("supraventricular")) {
    params.rhythm = "non-sinus-regular"
    if (!params.heartRate) params.heartRate = 160
  }

  if (text.includes("ventricular tachy") || text.includes("vtach") || text.includes("vt ")) {
    params.rhythm = "non-sinus-regular"
    if (!params.heartRate) params.heartRate = 170
    if (!params.qrsDurationMs) params.qrsDurationMs = 140
  }

  if (text.includes("brady")) {
    if (!params.heartRate) params.heartRate = 50
    if (!params.rhythm) params.rhythm = "sinus-regular"
  }

  if (text.includes("tachy")) {
    if (!params.heartRate) params.heartRate = 120
    if (!params.rhythm) params.rhythm = "sinus-regular"
  }

  if (!params.rhythm && text.includes("irregular")) {
    params.rhythm = "non-sinus-irregular"
  }

  if (text.includes("st elevation") || text.includes("stemi") || text.includes("st-elevation")) {
    abnormalities.stElevation = true
  }

  if (text.includes("st depression") || text.includes("nstemi") || text.includes("ischemia") || text.includes("ischaemia")) {
    abnormalities.stDepression = true
  }

  if (text.includes("t wave inversion") || text.includes("t-wave inversion") || text.includes("inverted t")) {
    abnormalities.tWaveInversion = true
  }

  if (text.includes("q wave") || text.includes("q-wave") || text.includes("pathologic q") || text.includes("old mi")) {
    abnormalities.qWaves = true
  }

  if (text.includes("left axis") || text.includes("lad")) {
    abnormalities.leftAxis = true
  }

  if (text.includes("right axis") || text.includes("rad")) {
    abnormalities.rightAxis = true
  }

  if (text.includes("wide qrs") || text.includes("bundle branch") || text.includes("bbb")) {
    if (!params.qrsDurationMs) params.qrsDurationMs = 140
  }

  if (text.includes("first degree") || text.includes("prolonged pr")) {
    if (!params.prIntervalMs) params.prIntervalMs = 220
  }

  if (text.includes("short pr")) {
    params.prIntervalMs = 100
  }

  if (Object.keys(abnormalities).length > 0) {
    params.abnormalities = abnormalities
  }

  return params
}
