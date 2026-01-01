"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
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

export default function TeacherSimulationsPage() {
  const [mode, setMode] = useState<Mode>("simulation")
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(generateRandomECGParams())
  const [currentStep, setCurrentStep] = useState<InterpretationStep>(INTERPRETATION_STEPS[0])
  const [currentCase, setCurrentCase] = useState<PatientCase | null>(null)
  const [zoom, setZoom] = useState(1)
  const { user } = useAuth()
  const maxZoom = 3
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
    }
  }, [mode])

  // Generate new case when switching to case-based mode
  useEffect(() => {
    if (mode === "case-based") {
      const newCase = generateRandomCase()
      setCurrentCase(newCase)
      setEcgParams(newCase.ecgParams)
      setZoom(1)
    }
  }, [mode])

  const handleAnswerSubmit = async (answer: string): Promise<{ isCorrect: boolean; message: string; explanation?: string }> => {
    let isCorrect = false
    let message = ""
    let explanation: string | undefined

    try {
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
        isCorrect = aiResult.isCorrect
        message = aiResult.feedback
        explanation = aiResult.explanation
      }
    } catch (error) {
      console.error("AI validation failed, using rule-based:", error)
    }
    
    // Fallback to rule-based validation
    if (!message) {
      const result = validateAnswer(currentStep, answer, ecgParams)
      isCorrect = result.isCorrect
      message = result.message
    }

    return {
      isCorrect,
      message,
      explanation,
    }
  }

  const handleStepComplete = () => {
    const currentIndex = INTERPRETATION_STEPS.indexOf(currentStep)
    if (currentIndex < INTERPRETATION_STEPS.length - 1) {
      setCurrentStep(INTERPRETATION_STEPS[currentIndex + 1])
    } else {
      // All steps completed - restart
      setEcgParams(generateRandomECGParams())
      setCurrentStep(INTERPRETATION_STEPS[0])
    }
  }

  const hints = INTERPRETATION_STEPS.reduce((acc, step) => {
    acc[step] = getHintsForStep(step)
    return acc
  }, {} as Record<InterpretationStep, string[]>)

  return (
    <ProtectedRoute requiredRole="teacher">
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
                />
              </div>

              {/* ECG Display - Main Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3 mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                      <h2 className="text-2xl font-bold">ECG Lab (Instructor)</h2>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => nudgeZoom(0.25)}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => nudgeZoom(-0.25)}
                          disabled={!zoomEnabled}
                          className={!zoomEnabled ? "opacity-50" : undefined}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
                      <h2 className="text-2xl font-bold">ECG Lab (Instructor)</h2>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => nudgeZoom(0.25)}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => nudgeZoom(-0.25)}
                          disabled={!zoomEnabled}
                          className={!zoomEnabled ? "opacity-50" : undefined}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setZoom((z) => (z > 1 ? 1 : 1.75))}
                        >
                          {zoom > 1 ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
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
