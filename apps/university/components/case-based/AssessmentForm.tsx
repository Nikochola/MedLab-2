"use client"

import { useState } from "react"
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
import { Sparkles, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { saveCaseAssessment } from "@/lib/storage"

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
}

export function AssessmentForm({ patientCase, ecgFindings }: AssessmentFormProps) {
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

  return (
    <div className="h-full overflow-y-auto bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">ECG Assessment Form</h2>
          <p className="text-sm text-muted-foreground">
            Complete all sections based on the ECG findings
          </p>
        </div>

        {/* Rate & Rhythm */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Rate & Rhythm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Intervals */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Intervals</CardTitle>
            <CardDescription>Measure in milliseconds (ms)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Axis */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Axis</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.axis}
              onValueChange={(value) =>
                setFormData({ ...formData, axis: value as "normal" | "left" | "right" | "" })
              }
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
          </CardContent>
        </Card>

        {/* Chamber Enlargement */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Chamber Enlargement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Waveform Abnormalities */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Waveform Abnormalities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Diagnosis */}
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Final Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">ECG Interpretation / Diagnosis</Label>
              <Input
                id="diagnosis"
                type="text"
                placeholder="Enter your final ECG interpretation..."
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-xs text-muted-foreground text-center pb-4">
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
      </form>

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
