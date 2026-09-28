"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Clock3, Loader2, Send, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"

import { createPracticeAttemptId, practiceDurationSeconds, submitPracticeCompletion } from "@/lib/institution/submitPracticeCompletion"

export function InstitutionCasePractice(input: {
  caseId: string
  title: string
  modality: string
  difficulty: string
  durationMin: number
  patientSummary: string
  clinicalPrompt: string
  courseId: string | null
}) {
  const [answer, setAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<null | { score: number; isCorrect: boolean; correctDiagnosis: string; teachingPoints: string[] }>(null)
  const startedAt = useRef(Date.now())
  const attemptId = useRef(createPracticeAttemptId())

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting || result || !answer.trim()) return
    if (!input.courseId) {
      toast.error("Open this case from your class assignment so progress can be attributed correctly.")
      return
    }
    setIsSubmitting(true)
    const durationSec = practiceDurationSeconds(startedAt.current)
    try {
      const response = await fetch(`/api/student/institution-cases/${input.caseId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer, courseId: input.courseId, attemptId: attemptId.current, durationSec })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Case could not be submitted")
      setResult(payload)
      try {
        await submitPracticeCompletion({
          action: "case_submit",
          data: { caseId: `institution:${input.caseId}`, caseType: "institution", modality: input.modality, courseId: input.courseId, attemptId: attemptId.current, durationSec },
          context: { accuracy: Number(payload.score) / 100 }
        })
        await mutate("/api/student/stats")
      } catch {
        toast.info("Your case result was saved; XP will catch up when service is restored.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Case could not be submitted")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[18px] border border-[#dedbd2] bg-[#fffefa] shadow-[0_5px_0_rgba(14,15,18,.05)]">
          <header className="border-b border-[#e8e6df] p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#0047cc]">Custom case</span><span className="text-xs text-[#77746d]">{input.modality} · {input.difficulty}</span><span className="inline-flex items-center gap-1 text-xs text-[#77746d]"><Clock3 className="h-3.5 w-3.5" /> {input.durationMin} min</span></div><h1 className="mt-4 text-3xl font-semibold tracking-[-.035em] text-[#0e0f12]">{input.title}</h1></header>
          <section className="grid gap-px bg-[#e8e6df] md:grid-cols-2"><div className="bg-white p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8a8881]">Patient summary</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4f4d47]">{input.patientSummary}</p></div><div className="bg-[#faf9f5] p-6 sm:p-8"><Stethoscope className="h-5 w-5 text-[#0066ff]" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#8a8881]">Clinical task</p><p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[#353431]">{input.clinicalPrompt}</p></div></section>
          <form onSubmit={submit} className="p-6 sm:p-8"><label className="block"><span className="mb-2 block text-xs font-semibold text-[#4f4d47]">Your diagnosis and reasoning</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={Boolean(result)} maxLength={2000} rows={7} className="w-full rounded-[12px] border border-[#d8d5cc] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#0066ff] focus:ring-2 focus:ring-[#0066ff]/10 disabled:bg-[#f5f3ed]" placeholder="State the most likely diagnosis and explain the findings that support it." /></label>{!result ? <button disabled={isSubmitting || !answer.trim()} className="institution-button-primary mt-4"><>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isSubmitting ? "Saving…" : "Submit interpretation"}</></button> : <div className={`mt-5 rounded-[14px] border p-5 ${result.isCorrect ? "border-[#bbf7d0] bg-[#f0fdf4]" : "border-[#fde68a] bg-[#fffbeb]"}`}><div className="flex items-center gap-2"><CheckCircle2 className={`h-5 w-5 ${result.isCorrect ? "text-[#24713a]" : "text-[#b45309]"}`} /><h2 className="text-base font-semibold text-[#252521]">Practice score · {result.score}%</h2></div><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[#77746d]">Reference diagnosis</p><p className="mt-1 text-sm font-semibold text-[#353431]">{result.correctDiagnosis}</p>{result.teachingPoints.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#77746d]">Teaching points</p><ul className="mt-2 space-y-2 text-sm leading-6 text-[#4f4d47]">{result.teachingPoints.map((point) => <li key={point}>• {point}</li>)}</ul></div> : null}</div>}</form>
        </div>
      </div>
    </main>
  )
}
