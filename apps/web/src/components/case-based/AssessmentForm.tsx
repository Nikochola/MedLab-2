"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import type { CaseFeedback } from "@/lib/ai/aiClient"
import { useAuth } from "@/contexts/AuthContext"
import { saveCaseAssessment } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
}

const inputClass = "w-full rounded-lg border border-[#E8E6DF] bg-white px-2.5 py-2 text-[13px] text-[#0E0F12] outline-none placeholder:text-[#9B9A94] focus:border-[#C7D9FF] transition-colors"

function CheckboxItem({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border-[1.5px] transition-colors",
          checked ? "border-[#0066FF] bg-[#EEF3FF]" : "border-[#D8D5CC] bg-white"
        )}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </button>
      <span className={cn("text-[12px] font-medium", checked ? "text-[#0E0F12]" : "text-[#6B6A65]")}>{label}</span>
    </label>
  )
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
      return <p className="text-sm text-[#9B9A94]">{emptyState}</p>
    }

    return (
      <ul className="list-inside list-disc space-y-2 text-sm text-[#6B6A65]">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 px-5 pb-4 pt-5" style={{ borderBottom: "1px solid #F5F5F3" }}>
        <h2 className="text-sm font-semibold" style={{ color: "#0E0F12" }}>ECG Assessment</h2>
        <p className="mt-0.5 text-[11px]" style={{ color: "#9B9A94" }}>Complete all sections</p>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 p-5">
          {/* Rate & Rhythm */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <span className="text-[13px] font-semibold text-[#0E0F12]">Rate &amp; Rhythm</span>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-[#6B6A65]">Heart Rate (bpm)</span>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g., 75"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-[#6B6A65]">Rhythm</span>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Normal Sinus Rhythm"
                value={formData.rhythm}
                onChange={(e) => setFormData({ ...formData, rhythm: e.target.value })}
              />
            </div>
          </div>

          {/* Intervals */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#0E0F12]">Intervals</span>
              <span className="text-[10px] text-[#9B9A94]">milliseconds</span>
            </div>
            <div className="flex gap-1.5">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[10px] font-medium text-[#6B6A65]">PR</span>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="160"
                  value={formData.prInterval}
                  onChange={(e) => setFormData({ ...formData, prInterval: e.target.value })}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[10px] font-medium text-[#6B6A65]">QRS</span>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="90"
                  value={formData.qrsInterval}
                  onChange={(e) => setFormData({ ...formData, qrsInterval: e.target.value })}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[10px] font-medium text-[#6B6A65]">QT</span>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="400"
                  value={formData.qtInterval}
                  onChange={(e) => setFormData({ ...formData, qtInterval: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Axis */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <span className="text-[13px] font-semibold text-[#0E0F12]">Axis</span>
            <div className="flex flex-col gap-1.5">
              {([["normal", "Normal"], ["left", "Left Axis Deviation (LAD)"], ["right", "Right Axis Deviation (RAD)"]] as const).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, axis: value })}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      formData.axis === value ? "border-[#0066FF]" : "border-[#D8D5CC]"
                    )}
                  >
                    {formData.axis === value && <div className="h-2 w-2 rounded-full bg-[#0066FF]" />}
                  </button>
                  <span className={cn("text-[12px] font-medium", formData.axis === value ? "text-[#0E0F12]" : "text-[#6B6A65]")}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Chamber Enlargement */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <span className="text-[13px] font-semibold text-[#0E0F12]">Chamber Enlargement</span>
            <div className="flex flex-col gap-1.5">
              <CheckboxItem id="lvh" label="Left Ventricular Hypertrophy (LVH)" checked={formData.chamberEnlargement.lvh} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, lvh: v } })} />
              <CheckboxItem id="rvh" label="Right Ventricular Hypertrophy (RVH)" checked={formData.chamberEnlargement.rvh} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, rvh: v } })} />
              <CheckboxItem id="raa" label="Right Atrial Abnormality (RAA)" checked={formData.chamberEnlargement.raa} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, raa: v } })} />
              <CheckboxItem id="laa" label="Left Atrial Abnormality (LAA)" checked={formData.chamberEnlargement.laa} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, laa: v } })} />
            </div>
          </div>

          {/* Waveform Abnormalities */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <span className="text-[13px] font-semibold text-[#0E0F12]">Waveform Abnormalities</span>
            <div className="flex flex-col gap-1.5">
              <CheckboxItem id="qwaves" label="Q Waves (Pathologic)" checked={formData.waveformAbnormalities.qWaves} onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, qWaves: v } })} />
              <CheckboxItem id="stelevation" label="ST Elevation" checked={formData.waveformAbnormalities.stElevation} onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, stElevation: v } })} />
              <CheckboxItem id="stdepression" label="ST Depression" checked={formData.waveformAbnormalities.stDepression} onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, stDepression: v } })} />
              <CheckboxItem id="tinversion" label="T Wave Inversion" checked={formData.waveformAbnormalities.tWaveInversion} onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, tWaveInversion: v } })} />
            </div>
          </div>

          {/* Final Diagnosis */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3.5">
            <span className="text-[13px] font-semibold text-[#0E0F12]">Final Diagnosis</span>
            <span className="text-[11px] font-medium text-[#6B6A65]">ECG Interpretation / Diagnosis</span>
            <input
              type="text"
              className={inputClass}
              placeholder="Enter your final ECG interpretation..."
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            />
          </div>

          <p className="text-center text-[10px] text-[#9B9A94]">
            Form adapted from instructor-provided ECG assessment criteria.
          </p>
        </form>
      </div>

      {/* Sticky action buttons */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#F5F5F3] px-5 py-4">
        <Button type="submit" variant="default" size="lg" className="w-full" onClick={handleSubmit}>
          Submit Assessment
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
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

      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#0066FF]" />
              AI Tutor Feedback
            </DialogTitle>
            <DialogDescription>
              Structured feedback on your case assessment with targeted resources.
            </DialogDescription>
          </DialogHeader>

          {isLoadingFeedback && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#0066FF]" />
              <span className="ml-3 text-sm text-[#9B9A94]">Crunching the ECG details...</span>
            </div>
          )}

          {!isLoadingFeedback && feedbackError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {feedbackError}
            </div>
          )}

          {!isLoadingFeedback && !feedbackError && aiFeedback && (
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              <div className="rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-4">
                <p className="text-sm leading-relaxed text-[#6B6A65]">{aiFeedback.summary}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9A94]">What you got right</h4>
                {renderList(aiFeedback.strengths, "No positives identified yet.")}
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9A94]">What needs correction</h4>
                {renderList(aiFeedback.corrections, "No major corrections noted.")}
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9A94]">How to improve</h4>
                {renderList(aiFeedback.improvements, "No targeted improvements provided yet.")}
              </div>

              {aiFeedback.resources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9A94]">Resources</h4>
                  <ul className="space-y-2 text-sm">
                    {aiFeedback.resources.map((resource, index) => (
                      <li key={index} className="rounded-xl border border-[#E8E6DF] bg-[#FAFAF8] p-3">
                        <div className="font-medium text-[#0E0F12]">{resource.title}</div>
                        {resource.whyItMatters && <p className="text-[#6B6A65]">{resource.whyItMatters}</p>}
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-[#0066FF] underline underline-offset-4">
                            Visit resource
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
