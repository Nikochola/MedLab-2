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
      const rhythm = ecgParams.rhythm || "sinus-regular"
      const keywords: Record<string, string[]> = {
        "sinus-regular": ["sinus", "regular", "nsr", "normal"],
        "sinus-irregular": ["sinus", "irregular"],
        "non-sinus-regular": ["non-sinus", "junctional", "atrial", "regular"],
        "non-sinus-irregular": [
          "non-sinus",
          "irregular",
          "atrial fibrillation",
          "afib",
          "a-fib",
          "irregularly irregular",
        ],
      }

      const correctKeywords = keywords[rhythm] || keywords["sinus-regular"]
      const isCorrect = correctKeywords.some((keyword) => normalizedAnswer.includes(keyword))

      return {
        isCorrect,
        message: isCorrect
          ? `Correct! The rhythm is ${rhythm.replace("-", " ")}.`
          : "Not quite. Focus on sinus vs non-sinus and regular vs irregular patterns.",
      }
    }

    case "p-wave": {
      const rhythm = ecgParams.rhythm || "sinus-regular"
      const isSinus = rhythm.startsWith("sinus")
      const expectsPresent = isSinus
      const mentionsAbsent =
        normalizedAnswer.includes("absent") ||
        normalizedAnswer.includes("no p") ||
        normalizedAnswer.includes("no p wave") ||
        normalizedAnswer.includes("missing")
      const mentionsPresent =
        normalizedAnswer.includes("present") ||
        normalizedAnswer.includes("upright") ||
        normalizedAnswer.includes("p wave") ||
        normalizedAnswer.includes("p-wave")

      const isCorrect = expectsPresent ? mentionsPresent : mentionsAbsent

      return {
        isCorrect,
        message: isCorrect
          ? expectsPresent
            ? "Correct! P waves are present and should precede each QRS."
            : "Correct! P waves are absent in a non-sinus rhythm."
          : expectsPresent
          ? "P waves should be present in sinus rhythms. Look for small deflections before the QRS."
          : "In non-sinus rhythms, P waves are often absent or inconsistent. Look again.",
      }
    }

    case "pr-interval": {
      const prMs = ecgParams.prIntervalMs ?? 160
      const rhythm = ecgParams.rhythm ?? "sinus-regular"
      const answerNum = parseInt(normalizedAnswer.replace(/[^\d]/g, ""))
      const tolerance = 20
      const notMeasurable =
        prMs === 0 || rhythm.startsWith("non-sinus")
      const mentionsNotMeasurable =
        normalizedAnswer.includes("not measurable") ||
        normalizedAnswer.includes("not applicable") ||
        normalizedAnswer.includes("n/a") ||
        normalizedAnswer.includes("na") ||
        normalizedAnswer.includes("absent")

      if (notMeasurable) {
        const isCorrect = mentionsNotMeasurable
        return {
          isCorrect,
          message: isCorrect
            ? "Correct! The PR interval is not measurable in this rhythm."
            : "In non-sinus rhythms, the PR interval is often not measurable.",
        }
      }

      if (!Number.isFinite(answerNum)) {
        return {
          isCorrect: false,
          message: "Please enter the PR interval in milliseconds.",
        }
      }

      const isCorrect = Math.abs(answerNum - prMs) <= tolerance
      return {
        isCorrect,
        message: isCorrect
          ? `Correct! The PR interval is about ${prMs} ms.`
          : `Not quite. Re-check the PR interval; it should be close to ${prMs} ms.`,
      }
    }

    case "qrs-duration": {
      const qrsMs = ecgParams.qrsDurationMs ?? 90
      const answerNum = parseInt(normalizedAnswer.replace(/[^\d]/g, ""))
      const tolerance = 20

      if (!Number.isFinite(answerNum)) {
        return {
          isCorrect: false,
          message: "Please enter the QRS duration in milliseconds.",
        }
      }

      const isCorrect = Math.abs(answerNum - qrsMs) <= tolerance
      return {
        isCorrect,
        message: isCorrect
          ? `Correct! The QRS duration is about ${qrsMs} ms.`
          : `Not quite. Re-check the QRS duration; it should be close to ${qrsMs} ms.`,
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
      "Decide if the rhythm is sinus or non-sinus first.",
      "Then determine if it is regular or irregular.",
      "Irregularly irregular rhythms are typically non-sinus.",
    ],
    "p-wave": [
      "P waves should precede each QRS in sinus rhythms.",
      "Look for consistent P waves in lead II.",
      "Non-sinus rhythms often have absent or inconsistent P waves.",
    ],
    "pr-interval": [
      "Measure from the start of the P wave to the start of the QRS.",
      "Normal PR interval is about 120–200 ms (3–5 small boxes).",
      "Convert small boxes to ms (1 small box = 40 ms at 25 mm/s). If non-sinus, PR may be not measurable.",
    ],
    "qrs-duration": [
      "Measure from the start to the end of the QRS complex.",
      "Normal QRS duration is <120 ms (less than 3 small boxes).",
      "Use small boxes to estimate milliseconds.",
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
  }

  return hints[step] || []
}
