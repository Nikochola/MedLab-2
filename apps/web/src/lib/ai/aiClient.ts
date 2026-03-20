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

export async function generateCaseFeedback(
  studentAssessment: string,
  patientCase: string,
  clinicalFindings: string,
  role: string = "expert cardiologist"
): Promise<CaseFeedback> {
  const structuredAssessment = parseStructuredAssessment(studentAssessment)

  const prompt = `You are an ${role} reviewing a medical student's interpretation.

Patient Case (student saw this): ${patientCase}
Clinical Findings (provided to student): ${clinicalFindings}

Student's structured assessment (use this as the source of truth):
${studentAssessment}

Provide feedback that DIRECTLY references the student's specific entries (rate, rhythm, intervals, axis, hypertrophy/atrial findings, waveform abnormalities, final diagnosis). Highlight correct measurements/interpretations and point out any mismatches with typical ECG norms or likely diagnoses. Do not invent findings that are not in the student's assessment.

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
  if (assessment.rhythm?.trim()) {
    strengths.push(`Documented rhythm: ${assessment.rhythm.trim()}.`)
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
  if (assessment.axis) {
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
  if (assessment.diagnosis?.trim()) {
    strengths.push(`Provided a working diagnosis: ${assessment.diagnosis.trim()}.`)
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
