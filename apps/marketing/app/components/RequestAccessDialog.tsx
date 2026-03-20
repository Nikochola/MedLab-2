"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com"
])

function isPersonalEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] || ""
  return PERSONAL_DOMAINS.has(domain)
}

export function RequestAccessDialog(input: {
  triggerLabel: string
  triggerClassName: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle")
  const [error, setError] = useState<string | null>(null)
  const [workEmail, setWorkEmail] = useState("")
  const [wantsMeeting, setWantsMeeting] = useState(false)

  useEffect(() => {
    if (searchParams.get("requestAccess") === "1") {
      setOpen(true)
    }
  }, [searchParams])

  const personalEmailWarning = useMemo(() => {
    if (!workEmail || !workEmail.includes("@")) return null
    return isPersonalEmail(workEmail) ? "Use your institutional work email. Personal inboxes are not accepted." : null
  }, [workEmail])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      fullName: String(formData.get("fullName") || ""),
      workEmail: String(formData.get("workEmail") || ""),
      institutionName: String(formData.get("institutionName") || ""),
      institutionType: String(formData.get("institutionType") || ""),
      estimatedStudents: Number(formData.get("estimatedStudents") || 0),
      message: String(formData.get("message") || ""),
      wantsMeeting: formData.get("wantsMeeting") === "on"
    }

    if (isPersonalEmail(payload.workEmail)) {
      setError("Use your institutional work email. Personal inboxes are not accepted.")
      return
    }

    setStatus("submitting")

    const response = await fetch("/api/request-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })

    const json = await response.json()

    if (!response.ok) {
      setError(json.error || "Failed to submit request.")
      setStatus("idle")
      return
    }

    if (payload.wantsMeeting) {
      router.push("/institutions/schedule")
      return
    }

    setStatus("submitted")
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={input.triggerClassName}>
        {input.triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/50 bg-white p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)] md:p-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Close
            </button>

            {status === "submitted" ? (
              <div className="space-y-4 py-8 text-center">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Request received</p>
                <h2 className="text-3xl font-black text-slate-900">Thanks! We&apos;ll be in touch within 24–48 hours.</h2>
                <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600">
                  A MedLab team member will review your request and email a time-limited administrator setup link if the workspace is approved.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Request Access</p>
                  <h2 className="text-3xl font-black text-slate-900">Tell us about your institution</h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    MedLab institution workspaces are sales-assisted. Submit your details and we&apos;ll review your request before sending an administrator setup link.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full name</span>
                    <input name="fullName" required className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Work email</span>
                    <input
                      name="workEmail"
                      type="email"
                      required
                      value={workEmail}
                      onChange={(event) => setWorkEmail(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                    {personalEmailWarning ? (
                      <p className="text-xs font-semibold text-rose-600">{personalEmailWarning}</p>
                    ) : (
                      <p className="text-xs font-semibold text-slate-500">Institutional domains only. Gmail, Outlook, Yahoo, and similar personal inboxes are blocked.</p>
                    )}
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Institution name</span>
                    <input name="institutionName" required className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Institution type</span>
                    <select name="institutionType" defaultValue="Medical School" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white">
                      <option>University</option>
                      <option>Medical School</option>
                      <option>Hospital</option>
                      <option>Residency Program</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Estimated students</span>
                    <input name="estimatedStudents" type="number" min="1" required className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white" />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Brief message (optional)</span>
                    <textarea
                      name="message"
                      rows={4}
                      placeholder="What are you hoping to use MedLab for?"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </label>
                  <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <input
                      name="wantsMeeting"
                      type="checkbox"
                      checked={wantsMeeting}
                      onChange={(event) => setWantsMeeting(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <span>
                      <span className="block text-sm font-black text-slate-900">I want to schedule a meeting with the MedLab team</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-600">
                        After you submit, we&apos;ll route you to a separate scheduling page.
                      </span>
                    </span>
                  </label>
                </div>

                {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Response time: 24–48 hours</p>
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "submitting" ? "Submitting..." : "Request Access"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
