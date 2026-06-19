"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, Sparkles, ChevronRight, ChevronLeft, Check,
  ThumbsUp, AlertCircle, BookOpen, XCircle, Trophy, Zap,
} from "lucide-react"
import { mutate } from "swr"
import type { CaseFeedback } from "@/lib/ai/aiClient"
import { handleAiLimit } from "@/lib/ai/aiClientErrors"
import { useAuth } from "@/contexts/AuthContext"
import { saveCaseAssessment } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AssessmentFormData {
  rate: string
  rhythm: string
  prInterval: string
  qrsInterval: string
  qtInterval: string
  axis: "normal" | "left" | "right" | ""
  chamberEnlargement: { lvh: boolean; rvh: boolean; raa: boolean; laa: boolean }
  waveformAbnormalities: { qWaves: boolean; stElevation: boolean; stDepression: boolean; tWaveInversion: boolean }
  diagnosis: string
}

interface AssessmentFormProps {
  patientCase?: string
  ecgFindings?: string
}

const STEPS = [
  { id: "rate",      title: "Heart Rate",             subtitle: "What is the ventricular rate?" },
  { id: "rhythm",    title: "Rhythm",                 subtitle: "Describe the overall rhythm." },
  { id: "intervals", title: "Intervals",              subtitle: "Measure the key intervals in milliseconds." },
  { id: "axis",      title: "Electrical Axis",        subtitle: "Determine the mean QRS axis." },
  { id: "chambers",  title: "Chamber Enlargement",    subtitle: "Select all that apply, or continue if none." },
  { id: "waveforms", title: "Waveform Abnormalities", subtitle: "Select all that apply, or continue if none." },
  { id: "diagnosis", title: "Final Diagnosis",        subtitle: "Summarise your ECG interpretation." },
]

function isStepComplete(stepId: string, formData: AssessmentFormData): boolean {
  switch (stepId) {
    case "rate":      return formData.rate.trim() !== ""
    case "rhythm":    return formData.rhythm.trim() !== ""
    case "intervals": return formData.prInterval.trim() !== "" && formData.qrsInterval.trim() !== "" && formData.qtInterval.trim() !== ""
    case "axis":      return formData.axis !== ""
    case "chambers":  return true
    case "waveforms": return true
    case "diagnosis": return formData.diagnosis.trim() !== ""
    default:          return true
  }
}

function CheckboxItem({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" id={id} onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors duration-150",
        checked ? "border-[#0066FF] bg-[#EEF3FF]" : "border-[#E8E6DF] bg-white hover:border-[#C7D9FF] hover:bg-[#F7FAFF]"
      )}>
      <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
        checked ? "border-[#0066FF] bg-[#0066FF]" : "border-[#D8D5CC] bg-white")}>
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
      <span className={cn("text-[13px] font-medium", checked ? "text-[#0066FF]" : "text-[#6B6A65]")}>{label}</span>
    </button>
  )
}

function RadioItem({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect}
      className={cn("flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors duration-150",
        selected ? "border-[#0066FF] bg-[#EEF3FF]" : "border-[#E8E6DF] bg-white hover:border-[#C7D9FF] hover:bg-[#F7FAFF]"
      )}>
      <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-[#0066FF]" : "border-[#D8D5CC]")}>
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-[#0066FF]" />}
      </div>
      <span className={cn("text-[13px] font-medium", selected ? "text-[#0066FF]" : "text-[#6B6A65]")}>{label}</span>
    </button>
  )
}

function FeedbackSection({ icon: Icon, title, items, accent }: {
  icon: React.ElementType; title: string; items: string[]; accent: string
}) {
  if (!items.length) return null
  return (
    <div className={cn("rounded-2xl border-2 p-4", accent)}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-[12px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Placeholder box used in celebration screens ────────────────────────────
function AnimationPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn(
      "flex w-full items-center justify-center rounded-3xl border-2 border-dashed border-[#D8D5CC] bg-[#F5F4EF] animate-pulse",
      className
    )}>
      <span className="select-none text-[11px] font-semibold uppercase tracking-widest text-[#C5C3BB]">
        {label}
      </span>
    </div>
  )
}

// ── Counts from 0 up to `target` over `duration` ms ─────────────────────────
function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    setCount(0)
    const TICKS = 40
    const interval = duration / TICKS
    let tick = 0
    const timer = setInterval(() => {
      tick++
      const progress = tick / TICKS
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(eased * target))
      if (tick >= TICKS) clearInterval(timer)
    }, interval)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// ── Celebration screen components ────────────────────────────────────────────
function CelebScreen1({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <AnimationPlaceholder label="Celebration animation" className="h-44 w-full max-w-xs" />

      <div className="flex flex-col items-center gap-4 text-center animate-[slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF3FF] border-4 border-[#C7D9FF] animate-[pop-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.05s_both]">
          <Trophy className="h-9 w-9 text-[#0066FF]" />
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0E0F12]">Case Complete!</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A65]">You&apos;ve finished this ECG case assessment.</p>
        </div>
      </div>

      <Button size="lg" className="w-full max-w-xs" onClick={onContinue}>
        Continue <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </>
  )
}

function CelebScreen2({ streak, onContinue }: { streak: number; onContinue: () => void }) {
  const count = useCountUp(streak, 900)
  return (
    <>
      <AnimationPlaceholder label="Streak animation" className="h-44 w-full max-w-xs" />

      <div
        className="flex flex-col items-center gap-1"
        style={{ animation: "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <span className="text-[96px] font-extrabold leading-none text-[#FFC800]">{count}</span>
        <span className="text-[22px] font-bold text-[#FFC800]">day streak!</span>
      </div>

      <Button size="lg" className="w-full max-w-xs" onClick={onContinue}>
        Continue <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </>
  )
}

function CelebScreen3({ xpEarned, onContinue }: { xpEarned: number; onContinue: () => void }) {
  const count = useCountUp(xpEarned > 0 ? xpEarned : 25, 1100)
  return (
    <>
      <AnimationPlaceholder label="XP animation" className="h-44 w-full max-w-xs" />

      <div className="flex items-center gap-3 rounded-2xl bg-[#EEF3FF] border-2 border-[#C7D9FF] px-10 py-5 animate-[xp-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <Zap className="h-8 w-8 text-[#0066FF]" />
        <span className="text-[42px] font-extrabold tracking-tight text-[#0066FF]">+{count}</span>
      </div>

      <Button size="lg" className="w-full max-w-xs" onClick={onContinue}>
        Continue <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </>
  )
}

export function AssessmentForm({ patientCase, ecgFindings }: AssessmentFormProps) {
  const router = useRouter()
  const { user } = useAuth()

  const [formData, setFormData] = useState<AssessmentFormData>({
    rate: "", rhythm: "", prInterval: "", qrsInterval: "", qtInterval: "",
    axis: "",
    chamberEnlargement: { lvh: false, rvh: false, raa: false, laa: false },
    waveformAbnormalities: { qWaves: false, stElevation: false, stDepression: false, tWaveInversion: false },
    diagnosis: "",
  })

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const [animating, setAnimating] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [showValidationHint, setShowValidationHint] = useState(false)

  const [aiFeedback, setAiFeedback] = useState<CaseFeedback | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // 0 = hidden, 1 = case complete, 2 = streak, 3 = xp
  const [celebrationStep, setCelebrationStep] = useState<0 | 1 | 2 | 3>(0)

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setShowValidationHint(false)
    const timer = setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 220)
    return () => clearTimeout(timer)
  }, [currentStep])

  const goTo = (next: number, dir: "forward" | "back") => {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => { setCurrentStep(next); setAnimating(false) }, 180)
  }

  const handleNext = () => {
    const step = STEPS[currentStep]
    if (!isStepComplete(step.id, formData)) {
      setShaking(true)
      setShowValidationHint(true)
      setTimeout(() => setShaking(false), 500)
      return
    }
    setShowValidationHint(false)
    if (currentStep < STEPS.length - 1) goTo(currentStep + 1, "forward")
  }

  const handleBack = () => { if (currentStep > 0) goTo(currentStep - 1, "back") }

  const normalizeFeedbackPayload = (payload: Partial<CaseFeedback>): CaseFeedback => {
    if (!payload) return { strengths: [], corrections: [], improvements: [], resources: [], summary: "No feedback returned." }
    return {
      strengths:    Array.isArray(payload.strengths)    ? payload.strengths    : [],
      corrections:  Array.isArray(payload.corrections)  ? payload.corrections  : [],
      improvements: Array.isArray(payload.improvements) ? payload.improvements : [],
      resources:    Array.isArray(payload.resources)    ? payload.resources    : [],
      summary: typeof payload.summary === "string" ? payload.summary : "Add more detail to see a richer summary.",
    }
  }

  const submitAssessment = async () => {
    if (!user || submitted || isSubmitting) return
    setIsSubmitting(true)
    const submission = {
      studentId: user.id, studentName: user.name,
      classroomId: user.classroomId || "", teacherId: undefined,
      patientCase: patientCase ? JSON.parse(patientCase) : null,
      ecgFindings: ecgFindings ? JSON.parse(ecgFindings) : null,
      assessment: formData,
    }
    try {
      await saveCaseAssessment(submission)
      setSubmitted(true)
    } catch (error) {
      console.error("Error saving assessment", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const awardCaseXP = async (accuracy: number) => {
    if (!user) return
    try {
      const response = await fetch("/api/student/award-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          action: "case_submit",
          data: { caseId: patientCase ? JSON.parse(patientCase).id : null },
          context: { accuracy },
        }),
      })
      if (response.ok) {
        const { xpAwarded, currentStreak: streak } = await response.json()
        if (xpAwarded > 0) {
          setXpEarned(xpAwarded)
          mutate("/api/student/stats")
        }
        if (streak > 0) setCurrentStreak(streak)
      }
    } catch (error) {
      console.error("Error awarding XP", error)
    }
  }

  const handleGetAIFeedback = async () => {
    if (!user) { alert("Please sign in first."); return }
    setFeedbackError(null)
    setAiFeedback(null)
    setIsLoadingFeedback(true)
    setShowFeedback(true)
    submitAssessment()
    const assessmentSummary = JSON.stringify({
      rate: formData.rate, rhythm: formData.rhythm,
      prInterval: formData.prInterval, qrsInterval: formData.qrsInterval, qtInterval: formData.qtInterval,
      axis: formData.axis, chamberEnlargement: formData.chamberEnlargement,
      waveformAbnormalities: formData.waveformAbnormalities, diagnosis: formData.diagnosis,
    }, null, 2)
    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentAssessment: assessmentSummary, patientCase: patientCase || "Patient case information", findings: ecgFindings || "ECG findings", role: "expert cardiologist" }),
      })
      if (handleAiLimit(response)) return
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

  const isLastStep = currentStep === STEPS.length - 1
  const stepComplete = isStepComplete(STEPS[currentStep].id, formData)
  const slideClass = animating
    ? direction === "forward" ? "translate-x-4 opacity-0" : "-translate-x-4 opacity-0"
    : "translate-x-0 opacity-100"

  // ── Celebration overlay — fixed full screen ──────────────────────────────
  if (celebrationStep > 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white">
        <div key={celebrationStep} className="flex flex-1 flex-col items-center justify-between px-8 pb-10 pt-12">

          {/* ── Screen 1: Case Complete ── */}
          {celebrationStep === 1 && (
            <CelebScreen1 onContinue={() => setCelebrationStep(2)} />
          )}

          {/* ── Screen 2: Streak ── */}
          {celebrationStep === 2 && (
            <CelebScreen2 streak={currentStreak} onContinue={() => setCelebrationStep(3)} />
          )}

          {/* ── Screen 3: XP Earned ── */}
          {celebrationStep === 3 && (
            <CelebScreen3 xpEarned={xpEarned} onContinue={() => router.push("/learn")} />
          )}
        </div>
      </div>
    )
  }

  // ── AI Feedback view ──────────────────────────────────────────────────────
  if (showFeedback) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #F5F5F3" }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF3FF]">
              <Trophy className="h-4 w-4 text-[#0066FF]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0E0F12]">Case Complete</h2>
              <p className="text-[11px] text-[#9B9A94]">AI Tutor Feedback</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingFeedback && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF3FF]">
                <Sparkles className="h-5 w-5 text-[#0066FF]" />
              </div>
              <p className="text-[13px] font-medium text-[#0E0F12]">Analysing your assessment…</p>
              <p className="text-[12px] text-[#9B9A94]">The AI tutor is reviewing your ECG interpretation.</p>
              <Loader2 className="mt-2 h-5 w-5 animate-spin text-[#0066FF]" />
            </div>
          )}

          {!isLoadingFeedback && feedbackError && (
            <div className="p-5">
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{feedbackError}</div>
            </div>
          )}

          {!isLoadingFeedback && !feedbackError && aiFeedback && (
            <div className="flex flex-col gap-3.5 p-5">
              <div className="rounded-2xl bg-[#F5F7FF] border border-[#D6E4FF] p-4">
                <p className="text-[13px] leading-relaxed text-[#3D4A6B]">{aiFeedback.summary}</p>
              </div>
              <FeedbackSection icon={ThumbsUp} title="What you got right" items={aiFeedback.strengths}    accent="border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]" />
              <FeedbackSection icon={XCircle}  title="Needs correction"   items={aiFeedback.corrections}  accent="border-[#FECACA] bg-[#FFF1F2] text-[#991B1B]" />
              <FeedbackSection icon={AlertCircle} title="How to improve"  items={aiFeedback.improvements} accent="border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]" />
              {aiFeedback.resources.length > 0 && (
                <div className="rounded-2xl border-2 border-[#E8E6DF] bg-[#FAFAF8] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[#6B6A65]">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="text-[12px] font-bold uppercase tracking-wider">Resources</span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {aiFeedback.resources.map((resource, index) => (
                      <li key={index} className="rounded-xl border border-[#E8E6DF] bg-white p-3">
                        <div className="text-[13px] font-semibold text-[#0E0F12]">{resource.title}</div>
                        {resource.whyItMatters && <p className="mt-0.5 text-[12px] leading-snug text-[#6B6A65]">{resource.whyItMatters}</p>}
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex text-[12px] font-medium text-[#0066FF] underline underline-offset-2">
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
        </div>

        <div className="shrink-0 border-t border-[#F5F5F3] px-5 py-4">
          <Button size="lg" className="w-full" onClick={async () => {
            const strengths = aiFeedback?.strengths?.length ?? 0
            const corrections = aiFeedback?.corrections?.length ?? 0
            const total = strengths + corrections
            const accuracy = total > 0 ? strengths / total : 0.5
            await awardCaseXP(accuracy)
            setCelebrationStep(1)
          }} disabled={isLoadingFeedback}>
            <Check className="mr-2 h-4 w-4" />
            Finish
          </Button>
        </div>
      </div>
    )
  }

  // ── Step-by-step form ─────────────────────────────────────────────────────
  const step = STEPS[currentStep]
  const inputClass = "w-full rounded-xl border-2 border-[#E8E6DF] bg-white px-4 py-3 text-[14px] text-[#0E0F12] outline-none placeholder:text-[#C5C3BB] focus:border-[#0066FF] transition-colors"

  const renderStepContent = () => {
    switch (step.id) {
      case "rate":
        return (
          <input ref={inputRef as React.RefObject<HTMLInputElement>} type="number" className={inputClass}
            placeholder="e.g. 75" value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleNext()} />
        )
      case "rhythm":
        return (
          <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" className={inputClass}
            placeholder="e.g. Normal Sinus Rhythm" value={formData.rhythm}
            onChange={(e) => setFormData({ ...formData, rhythm: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleNext()} />
        )
      case "intervals":
        return (
          <div className="flex flex-col gap-3">
            {([["PR", "prInterval", "160"], ["QRS", "qrsInterval", "90"], ["QT", "qtInterval", "400"]] as const).map(([label, field, ph]) => (
              <div key={field} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right text-[12px] font-bold text-[#9B9A94]">{label}</span>
                <input type="number" className={inputClass} placeholder={ph} value={formData[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} />
                <span className="shrink-0 text-[11px] text-[#C5C3BB]">ms</span>
              </div>
            ))}
          </div>
        )
      case "axis":
        return (
          <div className="flex flex-col gap-2.5">
            <RadioItem label="Normal Axis"                selected={formData.axis === "normal"} onSelect={() => setFormData({ ...formData, axis: "normal" })} />
            <RadioItem label="Left Axis Deviation (LAD)"  selected={formData.axis === "left"}   onSelect={() => setFormData({ ...formData, axis: "left" })} />
            <RadioItem label="Right Axis Deviation (RAD)" selected={formData.axis === "right"}  onSelect={() => setFormData({ ...formData, axis: "right" })} />
          </div>
        )
      case "chambers":
        return (
          <div className="flex flex-col gap-2.5">
            <CheckboxItem id="lvh" label="Left Ventricular Hypertrophy (LVH)"  checked={formData.chamberEnlargement.lvh} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, lvh: v } })} />
            <CheckboxItem id="rvh" label="Right Ventricular Hypertrophy (RVH)" checked={formData.chamberEnlargement.rvh} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, rvh: v } })} />
            <CheckboxItem id="raa" label="Right Atrial Abnormality (RAA)"      checked={formData.chamberEnlargement.raa} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, raa: v } })} />
            <CheckboxItem id="laa" label="Left Atrial Abnormality (LAA)"       checked={formData.chamberEnlargement.laa} onChange={(v) => setFormData({ ...formData, chamberEnlargement: { ...formData.chamberEnlargement, laa: v } })} />
          </div>
        )
      case "waveforms":
        return (
          <div className="flex flex-col gap-2.5">
            <CheckboxItem id="qwaves"       label="Q Waves (Pathologic)" checked={formData.waveformAbnormalities.qWaves}        onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, qWaves: v } })} />
            <CheckboxItem id="stelevation"  label="ST Elevation"         checked={formData.waveformAbnormalities.stElevation}    onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, stElevation: v } })} />
            <CheckboxItem id="stdepression" label="ST Depression"        checked={formData.waveformAbnormalities.stDepression}   onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, stDepression: v } })} />
            <CheckboxItem id="tinversion"   label="T Wave Inversion"     checked={formData.waveformAbnormalities.tWaveInversion}  onChange={(v) => setFormData({ ...formData, waveformAbnormalities: { ...formData.waveformAbnormalities, tWaveInversion: v } })} />
          </div>
        )
      case "diagnosis":
        return (
          <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={cn(inputClass, "min-h-[110px] resize-none")}
            placeholder="e.g. Anterior STEMI — likely LAD occlusion"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} />
        )
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #F5F5F3" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#9B9A94]">{currentStep + 1} / {STEPS.length}</span>
          <span className="text-[11px] text-[#9B9A94]">ECG Assessment</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EEE8]">
          <div className="h-full rounded-full bg-[#0066FF] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step card */}
      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
        <div className={cn(
          "flex flex-1 flex-col gap-5 transition-all duration-[180ms] ease-out",
          slideClass,
          shaking && "animate-[shake_0.4s_ease-in-out]"
        )}>
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-bold text-[#0E0F12]">{step.title}</h2>
            <p className="text-[13px] text-[#9B9A94]">{step.subtitle}</p>
          </div>
          <div className="flex flex-col gap-2">{renderStepContent()}</div>
          {showValidationHint && !stepComplete && (
            <p className="text-[12px] font-medium text-red-500">Please answer this question before continuing.</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 border-t border-[#F5F5F3] px-5 py-4">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button type="button" variant="outline" size="lg" className="shrink-0" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {isLastStep ? (
            <Button type="button" size="lg" className="flex-1" onClick={handleGetAIFeedback} disabled={isLoadingFeedback}>
              {isLoadingFeedback
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                : <><Sparkles className="mr-2 h-4 w-4" />Get AI Feedback</>}
            </Button>
          ) : (
            <Button type="button" variant={stepComplete ? "default" : "muted"} size="lg" className="flex-1" onClick={handleNext}>
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
