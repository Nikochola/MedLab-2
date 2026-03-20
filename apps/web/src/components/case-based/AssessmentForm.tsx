"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import type { CaseFeedback } from "@/lib/ai/aiClient"
import { useAuth } from "@/contexts/AuthContext"
import { saveCaseAssessment } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

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

const checkboxLabelClass = "text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]"

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

  const normalizeFeedbackPayload = (payload: Partial<CaseFeedback>): CaseFeedback => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) {
      alert("Please sign in to submit.")
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
    }

    try {
      await saveCaseAssessment(submission)

      const response = await fetch("/api/student/award-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          action: "case_submit",
          data: {
            caseId: patientCase ? JSON.parse(patientCase).id : null,
          },
          context: {
            accuracy: 0.95,
          },
        }),
      })

      if (response.ok) {
        const { xpAwarded, reason } = await response.json()
        if (xpAwarded > 0) {
          toast.success(`Assessment Submitted (+${xpAwarded} XP)`, {
            description: reason,
            duration: 3000,
          })
          mutate(`/api/student/stats?studentId=${user.id}`)
        } else {
          toast.success("Assessment submitted successfully.")
        }
      } else {
        toast.success("Assessment submitted successfully.")
      }
    } catch (error) {
      console.error("Error saving assessment", error)
      toast.error("Unable to submit assessment. Try again.")
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
      2,
    )

    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAssessment: assessmentSummary,
          patientCase: patientCase || "Patient case information",
          findings: ecgFindings || "ECG findings",
          role: "expert cardiologist"
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
      return <p className="text-sm font-semibold text-[#708093] dark:text-[#b7c1d1]">{emptyState}</p>
    }

    return (
      <ul className="list-inside list-disc space-y-2 text-sm font-semibold text-[#4a586d] dark:text-[#dbe3ef]">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card variant="conceptShell">
          <div>
            <h2 className="font-display text-2xl font-black text-[#232a39] dark:text-[#eaf0f8]">ECG Assessment Form</h2>
            <p className="mt-1 text-sm font-semibold text-[#6f7c8f] dark:text-[#b8c2d2]">Complete each section based on the ECG findings.</p>
          </div>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Rate & Rhythm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label variant="concept" htmlFor="rate">Heart Rate (bpm)</Label>
              <Input
                variant="concept"
                id="rate"
                type="number"
                placeholder="e.g., 75"
                value={formData.rate}
                onChange={(event) => setFormData({ ...formData, rate: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label variant="concept" htmlFor="rhythm">Rhythm</Label>
              <Input
                variant="concept"
                id="rhythm"
                type="text"
                placeholder="e.g., Normal Sinus Rhythm"
                value={formData.rhythm}
                onChange={(event) => setFormData({ ...formData, rhythm: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Intervals</CardTitle>
            <CardDescription>Measure in milliseconds (ms).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label variant="concept" htmlFor="pr">PR Interval (ms)</Label>
              <Input
                variant="concept"
                id="pr"
                type="number"
                placeholder="e.g., 160"
                value={formData.prInterval}
                onChange={(event) => setFormData({ ...formData, prInterval: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label variant="concept" htmlFor="qrs">QRS Duration (ms)</Label>
              <Input
                variant="concept"
                id="qrs"
                type="number"
                placeholder="e.g., 90"
                value={formData.qrsInterval}
                onChange={(event) => setFormData({ ...formData, qrsInterval: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label variant="concept" htmlFor="qt">QT Interval (ms)</Label>
              <Input
                variant="concept"
                id="qt"
                type="number"
                placeholder="e.g., 400"
                value={formData.qtInterval}
                onChange={(event) => setFormData({ ...formData, qtInterval: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Axis</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.axis}
              onValueChange={(value) => setFormData({ ...formData, axis: value as "normal" | "left" | "right" | "" })}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="normal" id="axis-normal" />
                <Label htmlFor="axis-normal">Normal</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="left" id="axis-left" />
                <Label htmlFor="axis-left">Left Axis Deviation (LAD)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="right" id="axis-right" />
                <Label htmlFor="axis-right">Right Axis Deviation (RAD)</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Chamber Enlargement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="lvh">Left Ventricular Hypertrophy (LVH)</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="rvh">Right Ventricular Hypertrophy (RVH)</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="raa">Right Atrial Abnormality (RAA)</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="laa">Left Atrial Abnormality (LAA)</label>
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Waveform Abnormalities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="qwaves">Q Waves (Pathologic)</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="stelevation">ST Elevation</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="stdepression">ST Depression</label>
            </div>
            <div className="flex items-center gap-2">
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
              <label className={checkboxLabelClass} htmlFor="tinversion">T Wave Inversion</label>
            </div>
          </CardContent>
        </Card>

        <Card variant="conceptWidget">
          <CardHeader>
            <CardTitle className="text-lg">Final Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label variant="concept" htmlFor="diagnosis">ECG Interpretation / Diagnosis</Label>
              <Input
                variant="concept"
                id="diagnosis"
                type="text"
                placeholder="Enter your final ECG interpretation..."
                value={formData.diagnosis}
                onChange={(event) => setFormData({ ...formData, diagnosis: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <p className="pb-2 text-center text-xs font-semibold text-[#708093] dark:text-[#b7c1d1]">
          Form adapted from instructor-provided ECG assessment criteria.
        </p>

        <div className="space-y-3">
          <Button type="submit" variant="default" size="lg" className="w-full">
            Submit Assessment
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg" className="w-full"
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
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{aiFeedback.summary}</p>
              </div>

              <Card variant="conceptWidget">
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
                    <span className="font-medium text-foreground">Final diagnosis:</span> {formData.diagnosis || "—"}
                  </div>
                </CardContent>
              </Card>

              <Card variant="conceptWidget">
                <CardHeader>
                  <CardTitle className="text-base">What you got right</CardTitle>
                  <CardDescription>Keep building on these strengths.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderList(aiFeedback.strengths, "No positives identified yet. Double-check your measurements and descriptions.")}
                </CardContent>
              </Card>

              <Card variant="conceptWidget">
                <CardHeader>
                  <CardTitle className="text-base">What needs correction</CardTitle>
                  <CardDescription>Specific mistakes or misses to address.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderList(aiFeedback.corrections, "No major corrections noted. Revisit the tracing if something feels off.")}
                </CardContent>
              </Card>

              <Card variant="conceptWidget">
                <CardHeader>
                  <CardTitle className="text-base">How to improve</CardTitle>
                  <CardDescription>Actionable practice and focus areas.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderList(aiFeedback.improvements, "No targeted improvements provided yet. Try adding more detail.")}
                </CardContent>
              </Card>

              <Card variant="conceptWidget">
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
                          {resource.whyItMatters && <p className="text-muted-foreground">{resource.whyItMatters}</p>}
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
                    <p className="text-sm text-muted-foreground">Add more clinical detail to see curated resources.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFeedback(false)} disabled={isLoadingFeedback}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
