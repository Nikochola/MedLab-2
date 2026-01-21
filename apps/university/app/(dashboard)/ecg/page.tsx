"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { logStudentActivity, upsertStudentProgress } from "@/lib/studentTracking"
import { ECGDisplay } from "@/components/ecg/ECGDisplay"
import { DoctorPanel } from "@/components/simulation/DoctorPanel"
import { PatientCasePanel } from "@/components/case-based/PatientCasePanel"
import { AssessmentForm } from "@/components/case-based/AssessmentForm"
import { generateRandomECGParams, ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import { generateRandomCase, PatientCase } from "@/components/case-based/CaseGenerator"
import { InterpretationStep, INTERPRETATION_STEPS } from "@/lib/constants"
import { validateAnswer, getHintsForStep } from "@/lib/answerValidation"
import { STEP_QUESTIONS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

type Mode = "simulation" | "case-based"

function ECGPageContent() {
  const searchParams = useSearchParams()
  const modeParam = searchParams.get("mode")
  const [mode, setMode] = useState<Mode>(modeParam === "case-based" ? "case-based" : "simulation")
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(generateRandomECGParams())
  const [currentStep, setCurrentStep] = useState<InterpretationStep>(INTERPRETATION_STEPS[0])
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(null)
  const [zoom, setZoom] = useState(1)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [showCompletion, setShowCompletion] = useState(false)
  const [isDoctorCollapsed, setIsDoctorCollapsed] = useState(false)
  const [isCaseCollapsed, setIsCaseCollapsed] = useState(false)
  const [isAssessmentCollapsed, setIsAssessmentCollapsed] = useState(false)
  const { user } = useAuth()
  const maxZoom = 4
  const minZoom = 1
  const zoomEnabled = zoom > 1

  useEffect(() => {
    const nextMode = modeParam === "case-based" ? "case-based" : "simulation"
    if (nextMode !== mode) {
      setMode(nextMode)
    }
  }, [modeParam, mode])

  const nudgeZoom = (delta: number) => {
    setZoom((z) => Math.min(maxZoom, Math.max(minZoom, parseFloat((z + delta).toFixed(2)))))
  }

  // Generate new ECG when switching to simulation mode
  useEffect(() => {
    if (mode === "simulation") {
      setEcgParams(generateRandomECGParams())
      setCurrentStep(INTERPRETATION_STEPS[0])
      setZoom(1)
      setAnsweredCount(0)
      setShowCompletion(false)
    }
  }, [mode])

  // Generate new case when switching to case-based mode
  useEffect(() => {
    if (mode === "case-based") {
      const newCase = generateRandomCase()
      setCurrentCase(newCase)
      setEcgParams(newCase.ecgParams)
      setZoom(1)
      setAnsweredCount(0)
      setShowCompletion(false)
    }
  }, [mode])

  const handleAnswerSubmit = async (answer: string): Promise<{ isCorrect: boolean; message: string; explanation?: string }> => {
    let isCorrect = false
    let message = ""
    let explanation: string | undefined
    const normalizedAnswer = answer.trim().toLowerCase()
    const ruleBased = validateAnswer(currentStep, answer, ecgParams)
    const isNumeric = Boolean(normalizedAnswer.match(/^\d+(\.\d+)?/))
    const skipAI =
      (["heart-rate", "pr-interval", "qrs-duration"].includes(currentStep) && isNumeric) ||
      (currentStep === "pr-interval" &&
        (normalizedAnswer.includes("n/a") ||
          normalizedAnswer.includes("na") ||
          normalizedAnswer.includes("not measurable") ||
          normalizedAnswer.includes("not applicable") ||
          normalizedAnswer.includes("absent"))) ||
      normalizedAnswer.length < 4

    try {
      if (skipAI) {
        isCorrect = ruleBased.isCorrect
        message = ruleBased.message
      } else {
        // Try AI-enhanced validation first
        const response = await fetch("/api/ai/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentAnswer: answer,
            question: STEP_QUESTIONS[currentStep],
            ecgContext: JSON.stringify(ecgParams),
          }),
        })
        
        if (response.ok) {
          const aiResult = await response.json()
          if (!aiResult.isCorrect && ruleBased.isCorrect) {
            isCorrect = ruleBased.isCorrect
            message = ruleBased.message
          } else {
            isCorrect = aiResult.isCorrect
            message = aiResult.feedback
            explanation = aiResult.explanation
          }
        }
      }

    } catch (error) {
      console.error("AI validation failed, using rule-based:", error)
    }
    
    // Fallback to rule-based validation
    if (!message) {
      isCorrect = ruleBased.isCorrect
      message = ruleBased.message
    }

    // Track student activity
    if (user && user.role === "student") {
      try {
        await logStudentActivity({
          studentId: user.id,
          classroomId: user.classroomId ?? undefined,
          activityType: "simulation",
          data: {
            step: currentStep,
            correct: isCorrect,
            answer,
            ecgParams,
          }
        })
      } catch (err) {
        console.error("Activity tracking failed", err)
      }
    }

    return {
      isCorrect,
      message,
      explanation,
    }
  }

  const handleHintReveal = async (step: InterpretationStep, hintIndex: number, hintText: string) => {
    if (!user || user.role !== "student") return
    try {
      await logStudentActivity({
        studentId: user.id,
        classroomId: user.classroomId ?? undefined,
        activityType: "hint",
        data: {
          step,
          hintIndex,
          hint: hintText,
        },
      })
    } catch (err) {
      console.error("Hint tracking failed", err)
    }
  }

  const handleStepComplete = () => {
    const currentIndex = INTERPRETATION_STEPS.indexOf(currentStep)
    if (currentIndex < INTERPRETATION_STEPS.length - 1) {
      setCurrentStep(INTERPRETATION_STEPS[currentIndex + 1])
      setAnsweredCount((count) => Math.min(count + 1, INTERPRETATION_STEPS.length))
    } else {
      if (user && user.role === "student") {
        upsertStudentProgress({
          studentId: user.id,
          studentName: user.name ?? "Student",
          classroomId: user.classroomId ?? undefined,
          deltaSimulations: 1,
        }).catch((err) => {
          console.error("Failed to update simulation progress", err)
        })
      }
      // All steps completed - celebrate and restart
      setAnsweredCount(INTERPRETATION_STEPS.length)
      setShowCompletion(true)
      setTimeout(() => {
        setShowCompletion(false)
        setEcgParams(generateRandomECGParams())
        setCurrentStep(INTERPRETATION_STEPS[0])
        setAnsweredCount(0)
        setZoom(1)
      }, 2500)
    }
  }

  const hints = INTERPRETATION_STEPS.reduce((acc, step) => {
    acc[step] = getHintsForStep(step)
    return acc
  }, {} as Record<InterpretationStep, string[]>)

  return (
    <ProtectedRoute requiredRole="student">
      <div className="h-screen flex flex-col bg-transparent overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {mode === "simulation" ? (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Doctor Panel - Left Sidebar */}
              <div
                className={cn(
                  "w-full flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out p-4",
                  isDoctorCollapsed ? "lg:w-20" : "lg:w-[min(28vw,360px)]"
                )}
              >
                {isDoctorCollapsed ? (
                  <div className="h-full p-4">
                    <div className="flex h-full flex-col items-center justify-start gap-4">
                      <button
                        type="button"
                        className="rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
                        onClick={() => setIsDoctorCollapsed(false)}
                        aria-label="Expand tutor panel"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                        style={{ writingMode: "vertical-rl" }}
                      >
                        Tutor
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full">
                    <button
                      type="button"
                      className="absolute right-4 top-4 z-10 rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
                      onClick={() => setIsDoctorCollapsed(true)}
                      aria-label="Collapse tutor panel"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <DoctorPanel
                      currentStep={currentStep}
                      onAnswerSubmit={handleAnswerSubmit}
                      onStepComplete={handleStepComplete}
                      hints={hints}
                      ecgParams={ecgParams}
                      onHintReveal={handleHintReveal}
                    />
                  </div>
                )}
              </div>

              {/* ECG Display - Main Area */}
              <div className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out">
                <div className="p-6">
                  <div className="mb-4 sticky top-0 z-10 bg-transparent">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h2 className="text-2xl font-bold">ECG SIMULATION</h2>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Answered {answeredCount}/{INTERPRETATION_STEPS.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => nudgeZoom(0.25)}
                        >
                          <ZoomIn className="h-4 w-4" />
                          Zoom in
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => nudgeZoom(-0.25)}
                          disabled={!zoomEnabled}
                        >
                          <ZoomOut className="h-4 w-4" />
                          Zoom out
                        </Button>
                      </div>
                    </div>
                    {showCompletion && (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 animate-bounce">
                        Great job! You finished this ECG. Loading a new one...
                      </div>
                    )}
                    <p className="text-muted-foreground">
                      Step {INTERPRETATION_STEPS.indexOf(currentStep) + 1} of{" "}
                      {INTERPRETATION_STEPS.length}: {currentStep.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <ECGDisplay
                    params={ecgParams}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2 lg:flex-row lg:gap-1">
              {/* Patient Case - Left Column */}
              <div
                className={cn(
                  "w-full overflow-y-auto transition-all duration-300 ease-in-out",
                  isCaseCollapsed
                    ? "lg:w-20 lg:p-1"
                    : "lg:w-[min(28vw,360px)] lg:p-2"
                )}
              >
                {currentCase && (
                  <PatientCasePanel
                    case={currentCase}
                    collapsed={isCaseCollapsed}
                    onToggleCollapse={() => setIsCaseCollapsed((prev) => !prev)}
                  />
                )}
              </div>

              {/* ECG Display - Middle Column */}
              <div className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out lg:px-0">
                <div className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3 mb-2 sticky top-0 z-10 bg-transparent">
                      <h2 className="text-2xl font-bold">MedLab ECG</h2>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => nudgeZoom(0.25)}>
                          <ZoomIn className="h-4 w-4" />
                          Zoom in
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => nudgeZoom(-0.25)}
                          disabled={!zoomEnabled}
                        >
                          <ZoomOut className="h-4 w-4" />
                          Zoom out
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Review the ECG and complete the assessment form
                    </p>
                  </div>
                  <ECGDisplay
                    params={ecgParams}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                </div>
              </div>

              {/* Assessment Form - Right Column */}
              <div
                className={cn(
                  "w-full overflow-y-auto transition-all duration-300 ease-in-out",
                  isAssessmentCollapsed
                    ? "lg:w-20 lg:p-1"
                    : "lg:w-[min(28vw,360px)] lg:p-2"
                )}
              >
                {isAssessmentCollapsed ? (
                  <AssessmentForm
                    collapsed
                    onToggleCollapse={() => setIsAssessmentCollapsed(false)}
                    patientCase={currentCase ? JSON.stringify(currentCase, null, 2) : undefined}
                    ecgFindings={JSON.stringify(ecgParams, null, 2)}
                  />
                ) : (
                  <div className="lg:sticky lg:top-0">
                    <AssessmentForm 
                      onToggleCollapse={() => setIsAssessmentCollapsed(true)}
                      patientCase={currentCase ? JSON.stringify(currentCase, null, 2) : undefined}
                      ecgFindings={JSON.stringify(ecgParams, null, 2)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </ProtectedRoute>
  )
}

export default function ECGPage() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <ECGPageContent />
    </Suspense>
  )
}
