"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CaseFeedback } from "@/lib/ai/aiClient"
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { saveCaseAssessment } from "@/lib/storage"
import { upsertStudentProgress } from "@/lib/studentTracking"
import { cn } from "@/lib/utils"

interface AssessmentFormData {
  rate: string
  rhythm: string
  prInterval: string
  qrsInterval: string
  qtInterval: string
  axis: "normal" | "left" | "right" | ""
  chamberEnlargement: {
    lvh: boolean
    rvh: boolean
    raa: boolean
    laa: boolean
  }
  waveformAbnormalities: {
    qWaves: boolean
    stElevation: boolean
    stDepression: boolean
    tWaveInversion: boolean
  }
  diagnosis: string
}

interface AssessmentFormProps {
  patientCase?: string
  ecgFindings?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AssessmentForm({
  patientCase,
  ecgFindings,
  collapsed = false,
  onToggleCollapse,
}: AssessmentFormProps) {
  const parsedCase = useMemo(() => {
    if (!patientCase) return null
    try {
      return JSON.parse(patientCase) as { diagnosisOptions?: string[] }
    } catch {
      return null
    }
  }, [patientCase])
  const diagnosisOptions = parsedCase?.diagnosisOptions ?? []

  const [formData, setFormData] = useState<AssessmentFormData>({
    rate: "",
    rhythm: "",
    prInterval: "",
    qrsInterval: "",
    qtInterval: "",
    axis: "",
    chamberEnlargement: {
      lvh: false,
      rvh: false,
      raa: false,
      laa: false,
    },
    waveformAbnormalities: {
      qWaves: false,
      stElevation: false,
      stDepression: false,
      tWaveInversion: false,
    },
    diagnosis: "",
  })
  
  const [aiFeedback, setAiFeedback] = useState<CaseFeedback | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const { user } = useAuth()
  const steps = [
    {
      key: "rate-rhythm",
      title: "Rate & Rhythm",
      description: "Capture baseline rate and rhythm.",
    },
    {
      key: "intervals",
      title: "Intervals",
      description: "Measure PR, QRS, and QT intervals.",
    },
    {
      key: "axis",
      title: "Axis",
      description: "Determine frontal plane axis.",
    },
    {
      key: "chamber",
      title: "Chamber Enlargement",
      description: "Identify chamber hypertrophy or enlargement.",
    },
    {
      key: "waveform",
      title: "Waveform Abnormalities",
      description: "Note ST/T changes and pathologic Q waves.",
    },
    {
      key: "diagnosis",
      title: "Final Diagnosis",
      description: "Summarize your ECG interpretation.",
    },
  ]
  const [currentStep, setCurrentStep] = useState(0)

  const normalizeFeedbackPayload = (payload: any): CaseFeedback => {
    if (!payload) {
      return {
        strengths: [],
        corrections: [],
        improvements: [],
        resources: [],
        summary: "No feedback returned. Try again with more detail.",
      }
    }

    return {
      strengths: Array.isArray(payload.strengths) ? payload.strengths : [],
      corrections: Array.isArray(payload.corrections) ? payload.corrections : [],
      improvements: Array.isArray(payload.improvements) ? payload.improvements : [],
      resources: Array.isArray(payload.resources) ? payload.resources : [],
      summary: typeof payload.summary === "string" ? payload.summary : "Add more clinical detail to see a richer summary.",
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || user.role !== "student") {
      alert("Please sign in as a student to submit.")
      return
    }

    const submission = {
      studentId: user.id,
      studentName: user.name,
      classroomId: user.classroomId || "",
      teacherId: undefined,
      patientCase: patientCase ? JSON.parse(patientCase) : null,
      ecgFindings: ecgFindings ? JSON.parse(ecgFindings) : null,
      assessment: formData,
      aiFeedback: aiFeedback ?? null,
    }

    try {
      await saveCaseAssessment(submission)
      await upsertStudentProgress({
        studentId: user.id,
        studentName: user.name ?? "Student",
        classroomId: user.classroomId ?? undefined,
        deltaCases: 1,
      })
      alert("Assessment submitted to your teacher.")
    } catch (err) {
      console.error("Error saving assessment", err)
      alert("Unable to submit assessment. Try again.")
    }
  }

  const handleGetAIFeedback = async () => {
    setFeedbackError(null)
    setAiFeedback(null)
    setIsLoadingFeedback(true)
    setShowFeedback(true)
    
    const assessmentSummary = JSON.stringify(
      {
        rate: formData.rate,
        rhythm: formData.rhythm,
        prInterval: formData.prInterval,
        qrsInterval: formData.qrsInterval,
        qtInterval: formData.qtInterval,
        axis: formData.axis,
        chamberEnlargement: formData.chamberEnlargement,
        waveformAbnormalities: formData.waveformAbnormalities,
        diagnosis: formData.diagnosis,
      },
      null,
      2
    )
    
    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAssessment: assessmentSummary,
          patientCase: patientCase || "Patient case information",
          ecgFindings: ecgFindings || "ECG findings",
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiFeedback(normalizeFeedbackPayload(data.feedback))
      } else {
        setFeedbackError("Unable to generate AI feedback at this time. Please try again later.")
      }
    } catch (error) {
      console.error("AI feedback error:", error)
      setFeedbackError("Error generating feedback. Please try again.")
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const renderList = (items: string[], emptyState: string) => {
    if (!items.length) {
      return <p className="text-sm text-muted-foreground">{emptyState}</p>
    }

    return (
      <ul className="space-y-2 text-sm list-disc list-inside">
        {items.map((item, index) => (
          <li key={index} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    )
  }

  const feedbackSummary = aiFeedback?.summary ?? ""
  const stepperRef = useRef<HTMLDivElement | null>(null)
  const [stepperScale, setStepperScale] = useState(1)

  useEffect(() => {
    const element = stepperRef.current
    if (!element) return

    const updateScale = () => {
      const width = element.clientWidth || 802
      const scale = Math.min(1, width / 802)
      setStepperScale(Number(scale.toFixed(3)))
    }

    updateScale()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScale)
      return () => window.removeEventListener("resize", updateScale)
    }

    const observer = new ResizeObserver(updateScale)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (collapsed) {
    return (
      <div className="h-full p-4">
        <div className="flex h-full flex-col items-center justify-start gap-4">
          <button
            type="button"
            className="rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
            onClick={() => onToggleCollapse?.()}
            aria-label="Expand assessment panel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            style={{ writingMode: "vertical-rl" }}
          >
            Assessment
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold mb-2">ECG Assessment</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Complete each step based on the ECG findings.
            </p>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
              onClick={onToggleCollapse}
              aria-label="Collapse assessment panel"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="portal-surface w-full p-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div ref={stepperRef} className="w-full">
              <div
                style={{ "--stepper-scale": stepperScale } as React.CSSProperties}
                className="overflow-hidden rounded-[calc(100px*var(--stepper-scale))] bg-[#F5F5F5] transition-colors"
              >
                <div className="flex h-[calc(109px*var(--stepper-scale))] items-center justify-center bg-white px-[calc(36px*var(--stepper-scale))]">
                  <div
                    key={currentStep}
                    style={{ animation: "step-swap 220ms ease" }}
                    className="min-w-0"
                  >
                    <div
                      title={steps[currentStep].title}
                      className="truncate text-[calc(48px*var(--stepper-scale))] font-semibold leading-[calc(65px*var(--stepper-scale))] text-black"
                    >
                      {steps[currentStep].title}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-white/80 p-4 space-y-4 min-h-[300px] max-h-[300px] md:min-h-[360px] md:max-h-[360px] overflow-y-auto">
              <div>
                <div className="text-base font-bold">{steps[currentStep].title}</div>
                <div className="text-sm font-medium text-muted-foreground">{steps[currentStep].description}</div>
              </div>

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Heart Rate (bpm)</Label>
                <Input
                  id="rate"
                  type="number"
                  placeholder="e.g., 75"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rhythm">Rhythm</Label>
                <Input
                  id="rhythm"
                  type="text"
                  placeholder="e.g., Normal Sinus Rhythm"
                  value={formData.rhythm}
                  onChange={(e) => setFormData({ ...formData, rhythm: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pr">PR Interval (ms)</Label>
                <Input
                  id="pr"
                  type="number"
                  placeholder="e.g., 160"
                  value={formData.prInterval}
                  onChange={(e) => setFormData({ ...formData, prInterval: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrs">QRS Duration (ms)</Label>
                <Input
                  id="qrs"
                  type="number"
                  placeholder="e.g., 90"
                  value={formData.qrsInterval}
                  onChange={(e) => setFormData({ ...formData, qrsInterval: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qt">QT Interval (ms)</Label>
                <Input
                  id="qt"
                  type="number"
                  placeholder="e.g., 400"
                  value={formData.qtInterval}
                  onChange={(e) => setFormData({ ...formData, qtInterval: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <RadioGroup
              value={formData.axis}
              onValueChange={(value) =>
                setFormData({ ...formData, axis: value as "normal" | "left" | "right" | "" })
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="axis-normal" />
                <Label htmlFor="axis-normal" className="cursor-pointer">
                  Normal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="left" id="axis-left" />
                <Label htmlFor="axis-left" className="cursor-pointer">
                  Left Axis Deviation (LAD)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="right" id="axis-right" />
                <Label htmlFor="axis-right" className="cursor-pointer">
                  Right Axis Deviation (RAD)
                </Label>
              </div>
            </RadioGroup>
          )}

          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lvh"
                  checked={formData.chamberEnlargement.lvh}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      chamberEnlargement: {
                        ...formData.chamberEnlargement,
                        lvh: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="lvh" className="cursor-pointer">
                  Left Ventricular Hypertrophy (LVH)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rvh"
                  checked={formData.chamberEnlargement.rvh}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      chamberEnlargement: {
                        ...formData.chamberEnlargement,
                        rvh: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="rvh" className="cursor-pointer">
                  Right Ventricular Hypertrophy (RVH)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="raa"
                  checked={formData.chamberEnlargement.raa}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      chamberEnlargement: {
                        ...formData.chamberEnlargement,
                        raa: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="raa" className="cursor-pointer">
                  Right Atrial Abnormality (RAA)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="laa"
                  checked={formData.chamberEnlargement.laa}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      chamberEnlargement: {
                        ...formData.chamberEnlargement,
                        laa: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="laa" className="cursor-pointer">
                  Left Atrial Abnormality (LAA)
                </Label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="qwaves"
                  checked={formData.waveformAbnormalities.qWaves}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      waveformAbnormalities: {
                        ...formData.waveformAbnormalities,
                        qWaves: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="qwaves" className="cursor-pointer">
                  Q Waves (Pathologic)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stelevation"
                  checked={formData.waveformAbnormalities.stElevation}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      waveformAbnormalities: {
                        ...formData.waveformAbnormalities,
                        stElevation: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="stelevation" className="cursor-pointer">
                  ST Elevation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stdepression"
                  checked={formData.waveformAbnormalities.stDepression}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      waveformAbnormalities: {
                        ...formData.waveformAbnormalities,
                        stDepression: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="stdepression" className="cursor-pointer">
                  ST Depression
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tinversion"
                  checked={formData.waveformAbnormalities.tWaveInversion}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      waveformAbnormalities: {
                        ...formData.waveformAbnormalities,
                        tWaveInversion: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="tinversion" className="cursor-pointer">
                  T Wave Inversion
                </Label>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-2">
              <Label htmlFor="diagnosis">ECG Interpretation / Diagnosis</Label>
              {diagnosisOptions.length ? (
                <RadioGroup
                  value={formData.diagnosis}
                  onValueChange={(value) =>
                    setFormData({ ...formData, diagnosis: value })
                  }
                  className="space-y-2"
                >
                  {diagnosisOptions.map((option) => {
                    const optionId = `diag-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
                    return (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={optionId} />
                        <Label htmlFor={optionId} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              ) : (
                <Input
                  id="diagnosis"
                  type="text"
                  placeholder="Enter your final ECG interpretation..."
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="bg-background"
                />
              )}
            </div>
          )}
        </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="h-12"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                disabled={currentStep === steps.length - 1}
                className="h-12"
              >
                Next
              </Button>
            </div>

            {currentStep === steps.length - 1 && (
              <>
                <Separator />

                <div className="text-xs font-medium text-muted-foreground text-center pb-4">
                  Form adapted from instructor-provided ECG assessment criteria.
                </div>

                <div className="space-y-3">
                  <Button type="submit" className="w-full" size="lg">
                    Submit Assessment
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGetAIFeedback}
                    disabled={isLoadingFeedback || !formData.diagnosis.trim()}
                  >
                    {isLoadingFeedback ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating AI Feedback...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Get AI Feedback
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Tutor Feedback
            </DialogTitle>
            <DialogDescription>
              Structured feedback on your case assessment with targeted resources.
            </DialogDescription>
          </DialogHeader>

          {isLoadingFeedback && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Crunching the ECG details...</span>
            </div>
          )}

          {!isLoadingFeedback && feedbackError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {feedbackError}
            </div>
          )}

          {!isLoadingFeedback && !feedbackError && aiFeedback && (
            <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{feedbackSummary}</p>
              </div>

              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-base">Your submitted findings</CardTitle>
                  <CardDescription>Snapshot of the values you entered.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-medium text-foreground">Rate:</span> {formData.rate || "—"} bpm</div>
                    <div><span className="font-medium text-foreground">Rhythm:</span> {formData.rhythm || "—"}</div>
                    <div><span className="font-medium text-foreground">PR:</span> {formData.prInterval || "—"} ms</div>
                    <div><span className="font-medium text-foreground">QRS:</span> {formData.qrsInterval || "—"} ms</div>
                    <div><span className="font-medium text-foreground">QT:</span> {formData.qtInterval || "—"} ms</div>
                    <div><span className="font-medium text-foreground">Axis:</span> {formData.axis || "—"}</div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Chamber enlargement:</span>{" "}
                    {Object.entries(formData.chamberEnlargement)
                      .filter(([_, value]) => value)
                      .map(([key]) => key.toUpperCase())
                      .join(", ") || "None"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Waveform abnormalities:</span>{" "}
                    {Object.entries(formData.waveformAbnormalities)
                      .filter(([_, value]) => value)
                      .map(([key]) => key)
                      .join(", ") || "None"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Final diagnosis:</span>{" "}
                    {formData.diagnosis || "—"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-base">What you got right</CardTitle>
                  <CardDescription>Keep building on these strengths.</CardDescription>
                </CardHeader>
                <CardContent>{renderList(aiFeedback.strengths, "No positives identified yet—double-check your measurements and descriptions.")}</CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-base">What needs correction</CardTitle>
                  <CardDescription>Specific mistakes or misses to address.</CardDescription>
                </CardHeader>
                <CardContent>{renderList(aiFeedback.corrections, "No major corrections noted. If something feels off, revisit the tracing carefully.")}</CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-base">How to improve</CardTitle>
                  <CardDescription>Actionable practice and focus areas.</CardDescription>
                </CardHeader>
                <CardContent>{renderList(aiFeedback.improvements, "No targeted improvements provided yet. Try adding more detail to your assessment.")}</CardContent>
              </Card>

              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-base">Resources</CardTitle>
                  <CardDescription>Trusted places to reinforce the concepts.</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiFeedback.resources.length ? (
                    <ul className="space-y-3 text-sm">
                      {aiFeedback.resources.map((resource, index) => (
                        <li key={index} className="rounded-lg border border-border/60 bg-background/70 p-3">
                          <div className="font-medium">{resource.title}</div>
                          {resource.whyItMatters && (
                            <p className="text-muted-foreground">{resource.whyItMatters}</p>
                          )}
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex text-primary underline underline-offset-4"
                            >
                              Visit resource
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add more clinical detail to see curated resources.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="secondary"
              onClick={() => setShowFeedback(false)}
              disabled={isLoadingFeedback}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
