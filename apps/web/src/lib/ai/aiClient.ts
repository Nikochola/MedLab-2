import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = process.env.GEMINI_API_KEY || ""

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

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

const DEFAULT_MODEL = "gemini-1.5-flash"

export async function generateAIResponse(prompt: string, model: string = DEFAULT_MODEL) {
  if (!genAI) {
    throw new Error("Missing GEMINI_API_KEY")
  }

  try {
    // Some keys/regions prefer v1 explicitly
    const model_instance = genAI.getGenerativeModel({ model })
    const result = await model_instance.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error(`Error with model ${model}:`, error)

    // Automatic fallback to gemini-pro if flash fails with a 404
    if (error.message?.includes("404") && model !== "gemini-pro") {
      console.log("Attempting fallback to gemini-pro...")
      return generateAIResponse(prompt, "gemini-pro")
    }

    throw error
  }
}

export async function validateAnswerWithAI(
  studentAnswer: string,
  question: string,
  clinicalContext: string,
  correctAnswer?: string,
  specialty: string = "Diagnostic Medicine"
): Promise<{
  isCorrect: boolean
  feedback: string
  explanation: string
}> {
  const prompt = `You are an expert ${specialty} professor. You are teaching a clinical student.

### CONTEXT
${clinicalContext}
Objective: ${question}
Student's Answer: "${studentAnswer}"
${correctAnswer ? `Target Answer Reference: ${correctAnswer}` : ""}

### INSTRUCTIONS
1. Evaluate the answer for clinical accuracy. Be lenient with phrasing/synonyms as long as the medical core is solid.
2. Provide feedback that is supportive but high-standard. 
3. If they are slightly off, nudge them towards the right direction. 
4. Include a brief educational "pearl" or explanation.

### RESPONSE FORMAT (STRICT JSON)
{
  "isCorrect": boolean,
  "feedback": "Conversational, personality-driven feedback. Start with something like 'Spot on!' or 'Not quite, but you're on the right track...'",
  "explanation": "A concise medical explanation of the underlying physiology or pathology."
}`

  try {
    const response = await generateAIResponse(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        isCorrect: !!parsed.isCorrect,
        feedback: parsed.feedback || "Good effort. Let's look closer.",
        explanation: parsed.explanation || "",
      }
    }
    return {
      isCorrect: false,
      feedback: "I'm having a brief technical difficulty, but keep going!",
      explanation: response,
    }
  } catch (error) {
    console.error("AI validation error:", error)
    throw error
  }
}

export async function generateStepIntroduction(
  step: string,
  clinicalContext: string,
  specialty: string = "Diagnostic Medicine"
): Promise<string> {
  const prompt = `You are a world-class ${specialty} professor. Direct the student to the next step of the interpretation.

### CONTEXT
${clinicalContext}
Interpretation Step: ${step}

### INSTRUCTIONS
Ask the student a targeted, professional, yet conversational question to begin this step. Don't just say "What is the heart rate?". Instead, say something like "Alright, let's look at the rate. What's your estimate here?" or "Moving on, how would you describe the primary pattern on this film?".

Keep it to 1-2 sentences.`

  try {
    const response = await generateAIResponse(prompt)
    return response.trim().replace(/^"|"$/g, '')
  } catch (error) {
    console.error("AI intro generation error:", error)
    return `Let's proceed to the ${step} interpretation.`
  }
}

export async function generateHintWithAI(
  question: string,
  medicalContext: string,
  previousAttempts: string[],
  specialty: string = "Diagnostic Medicine",
  isFreeConsult: boolean = false
): Promise<string> {
  const prompt = isFreeConsult
    ? `You are an expert ${specialty} professor. A student is asking you a question during a simulation.
     Context: ${medicalContext}
     Student's Question: "${question}"
     Provide a helpful, professional, and personality-driven answer. Keep it concise (3 sentences max).`
    : `You are an expert ${specialty} professor. A student is struggling with: "${question}"
     Context: ${medicalContext}
     Previous attempts: ${previousAttempts.join(", ") || "None"}
     Provide a subtle, educational hint. Do not give the answer. 3 sentences max.`

  try {
    const response = await generateAIResponse(prompt)
    return response.trim()
  } catch (error) {
    console.error("AI hint generation error:", error)
    return "Look carefully at the ECG patterns and measurements. Consider reviewing the relevant concepts."
  }
}

// ... existing code ...

// Derives human-readable ground-truth findings from raw ECGWaveformParams JSON
function deriveExpectedFindings(ecgParamsJson: string): string {
  try {
    const p = JSON.parse(ecgParamsJson)
    const lines: string[] = []

    // Heart rate
    if (p.heartRate != null) {
      const rateLabel =
        p.heartRate < 60 ? "bradycardic" :
        p.heartRate > 100 ? "tachycardic" : "normal (60–100 bpm)"
      lines.push(`Heart Rate: ${p.heartRate} bpm — ${rateLabel}`)
    }

    // Rhythm
    const rhythmLabels: Record<string, string> = {
      normal: "Normal Sinus Rhythm",
      afib: "Atrial Fibrillation (irregularly irregular, no discrete P waves)",
      bradycardia: "Sinus Bradycardia",
      tachycardia: "Sinus Tachycardia",
    }
    if (p.rhythm) lines.push(`Rhythm: ${rhythmLabels[p.rhythm] ?? p.rhythm}`)

    // Expected intervals (derived from rhythm)
    if (p.rhythm === "normal" || p.rhythm === "bradycardia" || p.rhythm === "tachycardia") {
      lines.push("PR Interval: normal (120–200 ms)")
      lines.push("QRS Duration: narrow (<120 ms)")
      lines.push("QT Interval: normal for rate (approx 360–440 ms)")
    } else if (p.rhythm === "afib") {
      lines.push("PR Interval: not measurable (AF)")
      lines.push("QRS Duration: narrow unless aberrant conduction")
    }

    // Axis
    const abn = p.abnormalities ?? {}
    if (abn.leftAxis)       lines.push("Electrical Axis: Left Axis Deviation (LAD)")
    else if (abn.rightAxis) lines.push("Electrical Axis: Right Axis Deviation (RAD)")
    else                    lines.push("Electrical Axis: Normal")

    // ST / waveform abnormalities
    const presentAbnormalities: string[] = []
    if (abn.stElevation)      presentAbnormalities.push("ST Elevation")
    if (abn.stDepression)     presentAbnormalities.push("ST Depression")
    if (abn.qWaves)           presentAbnormalities.push("Pathological Q Waves")
    if (abn.tWaveInversion)   presentAbnormalities.push("T Wave Inversion")

    if (presentAbnormalities.length) {
      lines.push(`Waveform Abnormalities PRESENT: ${presentAbnormalities.join(", ")}`)
    } else {
      lines.push("Waveform Abnormalities: NONE")
    }

    // Chamber enlargement — not encoded in params, so explicitly state unknown
    lines.push("Chamber Enlargement: not directly encoded in this ECG simulation")

    return lines.join("\n")
  } catch {
    return `Raw ECG params: ${ecgParamsJson}`
  }
}

export async function generateCaseFeedback(
  studentAssessment: string,
  patientCase: string,
  clinicalFindings: string,
  role: string = "expert cardiologist"
): Promise<CaseFeedback> {
  const structuredAssessment = parseStructuredAssessment(studentAssessment)
  const expectedECG = parseExpectedECG(clinicalFindings)
  const expectedFindings = deriveExpectedFindings(clinicalFindings)

  const prompt = `You are an ${role} grading a medical student's ECG assessment.

PATIENT CASE (what the student read):
${patientCase}

CORRECT ECG GROUND TRUTH (derived from the simulation — use this to judge the student):
${expectedFindings}

STUDENT'S SUBMITTED ASSESSMENT:
${studentAssessment}

YOUR TASK:
Compare each field the student submitted against the correct ECG ground truth above.
- If a student value matches the ground truth, credit it as a strength.
- If a student value contradicts the ground truth (wrong rate, wrong rhythm, missed ST elevation, wrong axis, etc.), flag it as a correction with the correct value.
- If the student missed something present in the ground truth, flag it as a correction.
- Provide actionable improvements based on their specific errors or gaps.
- Do NOT be lenient — if their rate is 60 bpm but the ECG shows 95 bpm, that is wrong.
- Do NOT praise vague or placeholder answers (e.g., "normal" when the ECG is abnormal).

Return ONLY valid JSON:
{
  "strengths": ["...what they got correct compared to ground truth..."],
  "corrections": ["...specific mismatches with the correct ECG values, state the correct value..."],
  "improvements": ["...actionable coaching tied to their specific mistakes..."],
  "resources": [
    { "title": "...", "url": "https://...", "whyItMatters": "..." }
  ],
  "summary": "2-3 sentences: overall verdict with the most important error to fix"
}

Rules:
- Cite exact values (e.g., "The ECG rate was 95 bpm, you said 60 bpm").
- Prefer AHA/ESC/LITFL resources.
- No markdown outside the JSON.`

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

      if (structuredAssessment && (!aiFeedback.improvements || aiFeedback.improvements.length === 0)) {
        aiFeedback.improvements = generateDefaultImprovements(structuredAssessment)
      }

      const hasContent =
        aiFeedback.strengths.length ||
        aiFeedback.corrections.length ||
        aiFeedback.improvements.length ||
        aiFeedback.resources.length ||
        (aiFeedback.summary && aiFeedback.summary.trim().length > 0)

      if (!hasContent && structuredAssessment) {
        return buildRuleBasedFeedback(structuredAssessment, expectedECG)
      }

      return aiFeedback
    }

    if (structuredAssessment) {
      return buildRuleBasedFeedback(structuredAssessment, expectedECG)
    }

    return getGenericFallback()
  } catch (error) {
    console.error("AI case feedback error:", error)
    if (structuredAssessment) {
      return buildRuleBasedFeedback(structuredAssessment, expectedECG)
    }
    return getGenericFallback()
  }
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

interface ExpectedECG {
  heartRate?: number
  rhythm?: "normal" | "afib" | "bradycardia" | "tachycardia"
  axis?: "normal" | "left" | "right"
  stElevation?: boolean
  stDepression?: boolean
  qWaves?: boolean
  tWaveInversion?: boolean
}

function parseExpectedECG(ecgParamsJson: string): ExpectedECG {
  try {
    const p = JSON.parse(ecgParamsJson)
    const abn = p.abnormalities ?? {}
    return {
      heartRate: p.heartRate,
      rhythm: p.rhythm,
      axis: abn.leftAxis ? "left" : abn.rightAxis ? "right" : "normal",
      stElevation: !!abn.stElevation,
      stDepression: !!abn.stDepression,
      qWaves: !!abn.qWaves,
      tWaveInversion: !!abn.tWaveInversion,
    }
  } catch {
    return {}
  }
}

function buildRuleBasedFeedback(assessment: StructuredAssessment, expected: ExpectedECG = {}): CaseFeedback {
  const strengths: string[] = []
  const corrections: string[] = []
  const improvements: string[] = []

  const RHYTHM_LABELS: Record<string, string> = {
    normal: "Normal Sinus Rhythm",
    afib: "Atrial Fibrillation",
    bradycardia: "Sinus Bradycardia",
    tachycardia: "Sinus Tachycardia",
  }

  // ── Heart rate ──────────────────────────────────────────────────────────
  const studentRate = Number(assessment.rate)
  if (!Number.isNaN(studentRate) && studentRate > 0) {
    if (expected.heartRate != null) {
      const diff = Math.abs(studentRate - expected.heartRate)
      if (diff <= 10) {
        strengths.push(`Heart rate ${studentRate} bpm — matches the ECG value of ${expected.heartRate} bpm.`)
      } else {
        corrections.push(`Heart rate: you entered ${studentRate} bpm but the ECG shows ${expected.heartRate} bpm.`)
      }
    } else {
      if (studentRate >= 60 && studentRate <= 100) strengths.push(`Heart rate ${studentRate} bpm is in the normal range.`)
      else if (studentRate < 60) corrections.push(`Heart rate ${studentRate} bpm is bradycardic — reconcile with rhythm.`)
      else corrections.push(`Heart rate ${studentRate} bpm is tachycardic — ensure rhythm interpretation aligns.`)
    }
  } else {
    improvements.push("Include a measured heart rate to anchor your interpretation.")
  }

  // ── Rhythm ───────────────────────────────────────────────────────────────
  const studentRhythm = assessment.rhythm?.trim().toLowerCase() ?? ""
  if (studentRhythm) {
    if (expected.rhythm) {
      const expectedLabel = RHYTHM_LABELS[expected.rhythm] ?? expected.rhythm
      const rhythmMatches =
        (expected.rhythm === "normal" && (studentRhythm.includes("sinus") || studentRhythm.includes("normal") || studentRhythm.includes("nsr"))) ||
        (expected.rhythm === "afib" && (studentRhythm.includes("fib") || studentRhythm.includes("af "))) ||
        (expected.rhythm === "bradycardia" && studentRhythm.includes("brady")) ||
        (expected.rhythm === "tachycardia" && studentRhythm.includes("tachy")) ||
        studentRhythm.includes(expected.rhythm)

      if (rhythmMatches) {
        strengths.push(`Rhythm correctly identified as ${expectedLabel}.`)
      } else {
        corrections.push(`Rhythm: the ECG shows ${expectedLabel}, but you recorded "${assessment.rhythm}".`)
      }
    } else {
      strengths.push(`Rhythm documented: ${assessment.rhythm?.trim()}.`)
    }
  } else {
    improvements.push("State the rhythm explicitly (e.g., NSR, AF, sinus bradycardia).")
  }

  // ── Intervals (checked against physiological norms since not encoded in params) ──
  const pr = Number(assessment.prInterval)
  if (!Number.isNaN(pr) && pr > 0) {
    if (expected.rhythm === "afib") {
      improvements.push("PR interval is not measurable in AF — consider documenting ventricular rate instead.")
    } else if (pr >= 120 && pr <= 200) {
      strengths.push(`PR interval ${pr} ms — within normal limits (120–200 ms).`)
    } else if (pr > 200) {
      corrections.push(`PR interval ${pr} ms is prolonged (>200 ms) — consider first-degree AV block.`)
    } else {
      corrections.push(`PR interval ${pr} ms is short (<120 ms) — consider pre-excitation or junctional rhythm.`)
    }
  }

  const qrs = Number(assessment.qrsInterval)
  if (!Number.isNaN(qrs) && qrs > 0) {
    if (qrs < 120) strengths.push(`QRS ${qrs} ms — narrow, normal conduction.`)
    else corrections.push(`QRS ${qrs} ms is wide (≥120 ms) — consider bundle branch block or ventricular origin.`)
  }

  const qt = Number(assessment.qtInterval)
  if (!Number.isNaN(qt) && qt > 0) {
    if (qt > 460) corrections.push(`QT ${qt} ms appears prolonged — check QTc; risk of arrhythmia.`)
    else strengths.push(`QT ${qt} ms — not clearly prolonged.`)
  }

  // ── Axis ─────────────────────────────────────────────────────────────────
  if (assessment.axis) {
    if (expected.axis) {
      const axisLabels = { normal: "Normal", left: "Left Axis Deviation", right: "Right Axis Deviation" }
      if (assessment.axis === expected.axis) {
        strengths.push(`Axis correctly identified as ${axisLabels[expected.axis]}.`)
      } else {
        corrections.push(`Axis: ECG shows ${axisLabels[expected.axis]}, you selected ${axisLabels[assessment.axis as keyof typeof axisLabels] ?? assessment.axis}.`)
      }
    }
  } else {
    improvements.push("Include the frontal axis to complete your interpretation.")
  }

  // ── Waveform abnormalities vs ECG ground truth ────────────────────────────
  const waveChecks = [
    { key: "stElevation" as const,    label: "ST Elevation" },
    { key: "stDepression" as const,   label: "ST Depression" },
    { key: "qWaves" as const,         label: "Pathological Q Waves" },
    { key: "tWaveInversion" as const, label: "T Wave Inversion" },
  ]
  const studentWaves = assessment.waveformAbnormalities ?? {}
  for (const { key, label } of waveChecks) {
    const expectedPresent = expected[key]
    const studentFlagged = studentWaves[key as keyof typeof studentWaves]
    if (expectedPresent === undefined) continue
    if (expectedPresent && studentFlagged)  strengths.push(`Correctly identified ${label}.`)
    else if (expectedPresent && !studentFlagged) corrections.push(`${label} is present on this ECG — you missed it.`)
    else if (!expectedPresent && studentFlagged) corrections.push(`You flagged ${label} but it is not present on this ECG.`)
  }

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  if (assessment.diagnosis?.trim()) {
    improvements.push(`Review your diagnosis "${assessment.diagnosis.trim()}" against the findings above.`)
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
    corrections.length > 0
      ? `Your assessment had ${corrections.length} discrepanc${corrections.length > 1 ? "ies" : "y"} against the ECG. Review the corrections below and compare each entry to the actual tracing.`
      : strengths.length > 0
      ? "Good work — your assessment aligned well with this ECG's key findings. See improvements for how to deepen your analysis."
      : "Add measurements and a final diagnosis to receive targeted feedback."

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
