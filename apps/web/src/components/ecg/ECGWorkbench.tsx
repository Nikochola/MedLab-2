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
import { ZoomIn, ZoomOut, Activity, X, AlertCircle, ChevronDown } from "lucide-react"
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
  // Use a stable default on the first render so server and client produce identical HTML.
  // The useEffect below replaces it with random params (or preset) immediately after mount.
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(
    presetParams ?? { heartRate: 75, rhythm: "normal", abnormalities: {} }
  )
  const [currentStep, setCurrentStep] = useState<InterpretationStep>(INTERPRETATION_STEPS[0])
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(presetCase ?? null)
  const [zoom, setZoom] = useState(1)
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
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
    setHistoryCollapsed(false)
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
      }).then(() => mutate("/api/student/stats"))
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
        {mode === "simulation" && (
          <div
            className="w-full lg:w-[400px] flex-shrink-0 overflow-y-auto"
            style={{ borderRight: "1px solid #E8E6DF" }}
          >
            <DoctorPanel
              currentStep={currentStep}
              onAnswerSubmit={handleAnswerSubmit}
              onStepComplete={handleStepComplete}
              hints={hints}
              ecgParams={ecgParams}
            />
          </div>
        )}

        {/* MAIN AREA: ECG Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col" style={{ backgroundColor: "#FAFAF8" }}>
          {mode === "case-based" && (
            <div className="absolute bottom-4 left-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-xl px-4 py-3 shadow-sm" style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}>
              <button
                type="button"
                onClick={() => setHistoryCollapsed((collapsed) => !collapsed)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: "#0066FF" }} />
                  <span className="text-xs font-semibold" style={{ color: "#0066FF" }}>Presenting History</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-out ${historyCollapsed ? "rotate-180" : "rotate-0"}`}
                  style={{ color: "#0066FF" }}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${historyCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
              >
                <div className="overflow-hidden">
                  <p
                    className={`text-sm leading-relaxed transition-[transform,opacity,margin] duration-300 ease-out ${historyCollapsed ? "mt-0 -translate-y-1 opacity-0" : "mt-2 translate-y-0 opacity-100"}`}
                    style={{ color: "#0E0F12" }}
                  >
                    {currentCase?.historyOfPresentIllness}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
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
