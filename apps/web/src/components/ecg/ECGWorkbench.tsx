"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ECGDisplay } from "@/components/ecg/ECGDisplay"
import { DoctorPanel } from "@/components/simulation/DoctorPanel"
import { AssessmentForm } from "@/components/case-based/AssessmentForm"
import { generateRandomECGParams, ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import { generateRandomCase, PatientCase } from "@/components/case-based/CaseGenerator"
import { InterpretationStep, INTERPRETATION_STEPS, STEP_QUESTIONS } from "@/lib/constants"
import { validateAnswer, getHintsForStep } from "@/lib/answerValidation"
import { ZoomIn, ZoomOut, Activity, X, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { mutate } from "swr"

type Mode = "simulation" | "case-based"

export function ECGWorkbench({
  initialMode = "simulation",
  presetCase,
  presetParams,
}: {
  initialMode?: Mode
  presetCase?: PatientCase
  presetParams?: ECGWaveformParams
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(presetParams ?? generateRandomECGParams())
  const [currentStep, setCurrentStep] = useState<InterpretationStep>(INTERPRETATION_STEPS[0])
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(presetCase ?? null)
  const [zoom, setZoom] = useState(1)
  const { user, setWorkbenchMode } = useAuth()
  const router = useRouter()

  // Enter workbench mode on mount, exit on unmount
  useEffect(() => {
    setWorkbenchMode(true)
    return () => setWorkbenchMode(false)
  }, [setWorkbenchMode])

  useEffect(() => {
    setMode(initialMode)
    if (presetCase) {
      setCurrentCase(presetCase)
      setEcgParams(presetCase.ecgParams)
    } else if (presetParams) {
      setEcgParams(presetParams)
      setCurrentCase(null)
    } else if (initialMode === "simulation") {
      setEcgParams(generateRandomECGParams())
      setCurrentStep(INTERPRETATION_STEPS[0])
      setCurrentCase(null)
    } else {
      const newCase = generateRandomCase()
      setCurrentCase(newCase)
      setEcgParams(newCase.ecgParams)
    }
    setZoom(1)
  }, [initialMode, presetCase, presetParams])

  const nudgeZoom = (delta: number) => {
    setZoom((z) => Math.min(3, Math.max(1, parseFloat((z + delta).toFixed(2)))))
  }

  const handleExit = () => {
    router.push("/ecg")
  }

  const handleAnswerSubmit = async (answer: string): Promise<{ isCorrect: boolean; message: string; explanation?: string }> => {
    let isCorrect = false
    let message = ""
    let explanation: string | undefined

    try {
      const response = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswer: answer,
          question: STEP_QUESTIONS[currentStep],
          context: JSON.stringify(ecgParams),
          specialty: "ECG Interpretation",
        }),
      })

      if (response.ok) {
        const aiResult = await response.json()
        isCorrect = aiResult.isCorrect
        message = aiResult.feedback
        explanation = aiResult.explanation
      }
    } catch (error) {
      console.error("AI validation failed, using rule-based fallback")
    }

    if (!message) {
      const result = validateAnswer(currentStep, answer, ecgParams)
      isCorrect = result.isCorrect
      message = result.message
    }

    if (user && user.role === "student" && isCorrect) {
      void fetch("/api/student/award-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          action: "ecg_step_correct",
          data: { step: currentStep }
        }),
      }).then(() => mutate(`/api/student/stats?studentId=${user.id}`))
    }

    return { isCorrect, message, explanation }
  }

  const handleStepComplete = () => {
    const currentIndex = INTERPRETATION_STEPS.indexOf(currentStep)
    if (currentIndex < INTERPRETATION_STEPS.length - 1) {
      setCurrentStep(INTERPRETATION_STEPS[currentIndex + 1])
    } else {
      setEcgParams(generateRandomECGParams())
      setCurrentStep(INTERPRETATION_STEPS[0])
    }
  }

  const hints = INTERPRETATION_STEPS.reduce((acc, step) => {
    acc[step] = getHintsForStep(step)
    return acc
  }, {} as Record<InterpretationStep, string[]>)

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Session topbar */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 56, borderBottom: "1px solid #E8E6DF" }}
      >
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4" style={{ color: "#0066FF" }} />
          <span className="text-sm font-semibold" style={{ color: "#0E0F12" }}>
            ECG {mode === "simulation" ? "Simulation" : "Case Study"}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "#EEF3FF", color: "#0066FF" }}>
            {mode === "simulation" ? `Step ${INTERPRETATION_STEPS.indexOf(currentStep) + 1}/${INTERPRETATION_STEPS.length}` : "In Progress"}
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 rounded-[9px] px-3 py-2 text-xs font-medium transition-colors"
          style={{ color: "#6B6A65", border: "1px solid #E8E6DF" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F5F5F3"; e.currentTarget.style.borderColor = "#D8D5CC" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#E8E6DF" }}
        >
          <X className="h-3.5 w-3.5" />
          Exit Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT PANEL: AI Tutor or Case Info */}
        <div
          className="w-full lg:w-[400px] flex-shrink-0 overflow-y-auto"
          style={{ borderRight: "1px solid #E8E6DF" }}
        >
          {mode === "simulation" ? (
            <DoctorPanel
              currentStep={currentStep}
              onAnswerSubmit={handleAnswerSubmit}
              onStepComplete={handleStepComplete}
              hints={hints}
              ecgParams={ecgParams}
            />
          ) : (
            <div className="flex flex-col p-6 space-y-5 h-full">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#9B9A94" }}>Clinical Context</p>
                <h2 className="text-xl font-semibold" style={{ color: "#0E0F12" }}>{currentCase?.age}-year-old {currentCase?.gender}</h2>
                <p className="text-sm mt-1" style={{ color: "#6B6A65" }}>{currentCase?.chiefComplaint}</p>
              </div>

              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: "#0066FF" }} />
                  <span className="text-xs font-semibold" style={{ color: "#0066FF" }}>Presenting History</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#0E0F12" }}>{currentCase?.historyOfPresentIllness}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9B9A94" }}>Medical Background</p>
                <p
                  className="text-sm leading-relaxed rounded-xl px-4 py-3"
                  style={{ color: "#6B6A65", backgroundColor: "#F5F5F3" }}
                >
                  {currentCase?.pastMedicalHistory}
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center rounded-xl px-4 py-6" style={{ border: "1px dashed #E8E6DF" }}>
                <p className="text-xs text-center" style={{ color: "#9B9A94" }}>
                  Analyze the rhythm strips, then complete the assessment form.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MAIN AREA: ECG Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col" style={{ backgroundColor: "#FAFAF8" }}>
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
            <button
              onClick={() => nudgeZoom(0.25)}
              className="flex items-center justify-center h-9 w-9 rounded-lg transition-colors"
              style={{ backgroundColor: "white", border: "1px solid #E8E6DF" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D9FF" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6DF" }}
            >
              <ZoomIn className="h-4 w-4" style={{ color: "#6B6A65" }} />
            </button>
            <button
              onClick={() => nudgeZoom(-0.25)}
              className="flex items-center justify-center h-9 w-9 rounded-lg transition-colors"
              style={{ backgroundColor: "white", border: "1px solid #E8E6DF" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D9FF" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6DF" }}
            >
              <ZoomOut className="h-4 w-4" style={{ color: "#6B6A65" }} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <ECGDisplay params={ecgParams} zoom={zoom} fitToContainer />
          </div>
        </div>

        {/* RIGHT PANEL: Case-based Mode Assessment Form */}
        {mode === "case-based" && (
          <div
            className="w-full lg:w-[380px] flex-shrink-0 overflow-y-auto"
            style={{ borderLeft: "1px solid #E8E6DF" }}
          >
            <AssessmentForm patientCase={JSON.stringify(currentCase)} ecgFindings={JSON.stringify(ecgParams)} />
          </div>
        )}
      </div>
    </div>
  )
}
