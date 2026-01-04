"use client"

import { useState, useEffect } from "react"
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
import { Activity, BookOpen, ZoomIn, ZoomOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

type Mode = "simulation" | "case-based"

export default function ECGPage() {
  const [mode, setMode] = useState<Mode>("simulation")
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(generateRandomECGParams())
  const [currentStep, setCurrentStep] = useState<InterpretationStep>(INTERPRETATION_STEPS[0])
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(null)
  const [zoom, setZoom] = useState(1)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [showCompletion, setShowCompletion] = useState(false)
  const { user } = useAuth()
  const maxZoom = 4
  const minZoom = 1
  const zoomEnabled = zoom > 1

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
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {mode === "simulation" ? (
            <div className="h-full flex flex-col lg:flex-row">
              {/* Doctor Panel - Left Sidebar */}
              <div className="w-full lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border">
                <DoctorPanel
                  currentStep={currentStep}
                  onAnswerSubmit={handleAnswerSubmit}
                  onStepComplete={handleStepComplete}
                  hints={hints}
                  ecgParams={ecgParams}
                  onHintReveal={handleHintReveal}
                />
              </div>

              {/* ECG Display - Main Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Patient Case - Left Column */}
              <div className="col-span-1 lg:col-span-3 border-r border-border overflow-y-auto">
                {currentCase && <PatientCasePanel case={currentCase} />}
              </div>

              {/* ECG Display - Middle Column */}
              <div className="col-span-1 lg:col-span-6 border-r border-border overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3 mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
              <div className="col-span-1 lg:col-span-3 overflow-y-auto">
                <AssessmentForm 
                  patientCase={currentCase ? JSON.stringify(currentCase, null, 2) : undefined}
                  ecgFindings={JSON.stringify(ecgParams, null, 2)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-16 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-center gap-4 px-6 flex-shrink-0">
          <Button
            variant={mode === "simulation" ? "tritary" : "default"}
            onClick={() => setMode("simulation")}
            className={`flex-1 max-w-xs transition-all duration-200 ${
              mode === "simulation"
            }`}
          >
            <Activity className="h-4 w-4 mr-2" />
            ECG Simulation Mode
          </Button>
          <Button
            variant={mode === "case-based" ? "tritary" : "default"}
            onClick={() => setMode("case-based")}
            className={`flex-1 max-w-xs transition-all duration-200 ${
              mode === "case-based"
            }`}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Case-Based Mode
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
