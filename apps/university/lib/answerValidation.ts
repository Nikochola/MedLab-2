import { InterpretationStep } from "./constants"
import { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"

export interface AnswerValidationResult {
  isCorrect: boolean
  message: string
}

export function validateAnswer(
  step: InterpretationStep,
  answer: string,
  ecgParams: ECGWaveformParams
): AnswerValidationResult {
  const normalizedAnswer = answer.toLowerCase().trim()

  switch (step) {
    case "heart-rate": {
      const heartRate = ecgParams.heartRate || 75
      const answerNum = parseInt(normalizedAnswer.replace(/[^\d]/g, ""))
      const tolerance = 10

      if (Math.abs(answerNum - heartRate) <= tolerance) {
        return {
          isCorrect: true,
          message: `Correct! The heart rate is approximately ${heartRate} bpm.`,
        }
      }

      if (answerNum < heartRate - tolerance) {
        return {
          isCorrect: false,
          message: "The heart rate appears to be higher. Try counting again.",
        }
      } else {
        return {
          isCorrect: false,
          message: "The heart rate appears to be lower. Try counting again.",
        }
      }
    }

    case "rhythm": {
      const rhythm = ecgParams.rhythm || "normal"
      const keywords: Record<string, string[]> = {
        normal: ["normal", "sinus", "regular", "nsr"],
        afib: ["atrial fibrillation", "afib", "a-fib", "irregular", "irregularly irregular"],
        bradycardia: ["bradycardia", "brady", "slow"],
        tachycardia: ["tachycardia", "tachy", "fast", "rapid"],
      }

      const correctKeywords = keywords[rhythm] || keywords.normal
      const isCorrect = correctKeywords.some((keyword) =>
        normalizedAnswer.includes(keyword)
      )

      return {
        isCorrect,
        message: isCorrect
          ? `Correct! The rhythm is ${rhythm === "normal" ? "normal sinus rhythm" : rhythm}.`
          : `Not quite. Look for ${rhythm === "afib" ? "irregularly irregular rhythm without distinct P waves" : rhythm === "normal" ? "regular rhythm with consistent P waves" : rhythm} patterns.`,
      }
    }

    case "p-wave": {
      const rhythm = ecgParams.rhythm || "normal"
      if (rhythm === "afib") {
        const isCorrect =
          normalizedAnswer.includes("absent") ||
          normalizedAnswer.includes("no p") ||
          normalizedAnswer.includes("no p wave") ||
          normalizedAnswer.includes("missing")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! In atrial fibrillation, P waves are absent."
            : "In this rhythm, P waves are absent. Look again.",
        }
      } else {
        const isCorrect =
          normalizedAnswer.includes("present") ||
          normalizedAnswer.includes("normal") ||
          normalizedAnswer.includes("upright") ||
          normalizedAnswer.includes("p wave")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! P waves are present and should be upright in most leads."
            : "P waves should be present in normal sinus rhythm. Look for small positive deflections before the QRS.",
        }
      }
    }

    case "qrs": {
      const hasQWaves = ecgParams.abnormalities?.qWaves
      const keywords = ["qrs", "complex", "duration", "morphology", "shape"]

      if (hasQWaves && normalizedAnswer.includes("q wave")) {
        return {
          isCorrect: true,
          message: "Correct! Q waves are present, indicating possible prior infarction.",
        }
      }

      const hasKeywords = keywords.some((keyword) =>
        normalizedAnswer.includes(keyword)
      )

      return {
        isCorrect: hasKeywords,
        message: hasKeywords
          ? "Good! The QRS complex is typically narrow (<120ms) in normal conduction."
          : "Describe the QRS complex - its duration, morphology, and any abnormalities.",
      }
    }

    case "axis": {
      const isLeft = ecgParams.abnormalities?.leftAxis
      const isRight = ecgParams.abnormalities?.rightAxis

      if (isLeft) {
        const isCorrect =
          normalizedAnswer.includes("left") || normalizedAnswer.includes("lad")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! There is left axis deviation."
            : "Look at leads I and aVF. Positive in I and negative in aVF suggests left axis deviation.",
        }
      } else if (isRight) {
        const isCorrect =
          normalizedAnswer.includes("right") || normalizedAnswer.includes("rad")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! There is right axis deviation."
            : "Look at leads I and aVF. Negative in I and positive in aVF suggests right axis deviation.",
        }
      } else {
        const isCorrect =
          normalizedAnswer.includes("normal") ||
          normalizedAnswer.includes("no deviation")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! The axis is normal."
            : "Check leads I and aVF. Both positive suggests normal axis.",
        }
      }
    }

    case "st-t": {
      const hasSTE = ecgParams.abnormalities?.stElevation
      const hasSTD = ecgParams.abnormalities?.stDepression
      const hasTInv = ecgParams.abnormalities?.tWaveInversion

      if (hasSTE) {
        const isCorrect =
          normalizedAnswer.includes("st elev") ||
          normalizedAnswer.includes("st-elev") ||
          normalizedAnswer.includes("elevation")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! ST elevation is present, which may indicate acute myocardial infarction."
            : "Look for ST segment elevation above the baseline.",
        }
      } else if (hasSTD) {
        const isCorrect =
          normalizedAnswer.includes("st depr") ||
          normalizedAnswer.includes("st-depr") ||
          normalizedAnswer.includes("depression")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! ST depression is present."
            : "Look for ST segment depression below the baseline.",
        }
      } else if (hasTInv) {
        const isCorrect =
          normalizedAnswer.includes("t wave") ||
          normalizedAnswer.includes("t-wave") ||
          normalizedAnswer.includes("inversion")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! T wave inversion is present."
            : "Look for inverted T waves.",
        }
      } else {
        const isCorrect =
          normalizedAnswer.includes("normal") ||
          normalizedAnswer.includes("no abnormality") ||
          normalizedAnswer.includes("unremarkable")

        return {
          isCorrect,
          message: isCorrect
            ? "Correct! ST segments and T waves appear normal."
            : "Describe any ST-T segment abnormalities or note if they're normal.",
        }
      }
    }

    case "final-impression": {
      // For final impression, be more lenient - just check if they have a reasonable interpretation
      const hasKeywords =
        normalizedAnswer.includes("sinus") ||
        normalizedAnswer.includes("rhythm") ||
        normalizedAnswer.includes("normal") ||
        normalizedAnswer.includes("ecg") ||
        normalizedAnswer.length > 10

      return {
        isCorrect: hasKeywords,
        message: hasKeywords
          ? "Great interpretation! You've completed the ECG analysis."
          : "Provide a comprehensive final impression summarizing your findings.",
      }
    }

    default:
      return {
        isCorrect: false,
        message: "Please provide a more detailed answer.",
      }
  }
}

export function getHintsForStep(step: InterpretationStep): string[] {
  const hints: Record<InterpretationStep, string[]> = {
    "heart-rate": [
      "Count the number of large boxes between R waves and divide 300 by that number.",
      "Alternatively, count small boxes between R waves and divide 1500 by that number.",
      "For irregular rhythms, count all QRS complexes in 10 seconds and multiply by 6.",
    ],
    rhythm: [
      "Look for the presence and regularity of P waves.",
      "Check if the rhythm is regular or irregular.",
      "In atrial fibrillation, there are no P waves and the rhythm is irregularly irregular.",
    ],
    "p-wave": [
      "P waves should precede each QRS complex in normal sinus rhythm.",
      "In lead II, P waves are typically upright.",
      "Check if P waves are present, absent, or inverted.",
    ],
    qrs: [
      "Normal QRS duration is less than 120ms (3 small boxes).",
      "Look for the presence of Q waves, which may indicate prior infarction.",
      "Describe the overall shape and amplitude of the QRS complex.",
    ],
    axis: [
      "Look at lead I and lead aVF to determine the axis.",
      "Both positive = normal axis; I positive + aVF negative = left axis; I negative + aVF positive = right axis.",
      "Left axis deviation: positive in I, negative in aVF.",
    ],
    "st-t": [
      "ST elevation is concerning for acute MI; ST depression may indicate ischemia.",
      "Compare the ST segment to the baseline (TP segment).",
      "T wave inversion can be normal in some leads (V1-V3) but abnormal in others.",
    ],
    "final-impression": [
      "Summarize all your findings: rhythm, rate, axis, and any abnormalities.",
      "Include any clinical significance of the findings.",
      "Be concise but comprehensive in your interpretation.",
    ],
  }

  return hints[step] || []
}

