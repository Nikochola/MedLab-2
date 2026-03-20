"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, ArrowRight } from "lucide-react"

const institutionTypes = [
  "University",
  "Medical School",
  "Hospital",
  "Residency Program",
  "Other",
]

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-semibold uppercase"
        style={{ letterSpacing: "0.12em", color: "#9B9A94" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  height: 42,
  width: "100%",
  borderRadius: 9,
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  border: "1.5px solid #E8E6DF",
  backgroundColor: "#F8F7F2",
  color: "#0E0F12",
} as React.CSSProperties

export function CreateSetupLinkForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ setupUrl: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)

    const res = await fetch("/api/admin/setup-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        workEmail: formData.get("workEmail"),
        institutionName: formData.get("institutionName"),
        institutionType: formData.get("institutionType"),
        estimatedStudents: Number(formData.get("estimatedStudents") || "0"),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setResult(data)
      router.refresh()
    }
  }

  function copyUrl() {
    if (!result) return
    navigator.clipboard.writeText(result.setupUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ border: "1.5px solid #E8E6DF", backgroundColor: "white" }}
    >
      {/* Form header */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid #F0EEE8" }}>
        <h3 className="text-sm font-bold" style={{ color: "#0E0F12" }}>
          Generate Setup Link
        </h3>
        <p className="mt-0.5 text-xs" style={{ color: "#9B9A94" }}>
          Fill in the institution's details from your Cal.com call.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact Name">
            <input
              name="fullName"
              required
              placeholder="Dr. Jane Smith"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
            />
          </Field>

          <Field label="Work Email">
            <input
              name="workEmail"
              type="email"
              required
              placeholder="jane@university.edu"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
            />
          </Field>

          <Field label="Institution Name">
            <input
              name="institutionName"
              required
              placeholder="University of Medicine"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
            />
          </Field>

          <Field label="Institution Type">
            <select
              name="institutionType"
              required
              style={{ ...inputStyle, paddingRight: 12, cursor: "pointer" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
            >
              {institutionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </Field>

          <Field label="Estimated Students">
            <input
              name="estimatedStudents"
              type="number"
              min="0"
              defaultValue="50"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")}
            />
          </Field>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-[9px] px-5 text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            style={{
              backgroundColor: "#0066FF",
              border: "1.5px solid #0047CC",
              boxShadow: "0 3px 0 #0047CC",
            }}
          >
            {loading ? (
              "Generating..."
            ) : (
              <>
                Generate Link
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className="rounded-[9px] p-4 space-y-3"
            style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #BBF7D0" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase" style={{ letterSpacing: "0.12em", color: "#15803D" }}>
                Link ready — copy and send manually
              </p>
              <p className="text-xs" style={{ color: "#16A34A" }}>
                Expires {new Date(result.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div
              className="flex items-center gap-2 rounded-[7px] p-2"
              style={{ backgroundColor: "white", border: "1px solid #BBF7D0" }}
            >
              <p
                className="flex-1 truncate px-2 text-xs font-mono"
                style={{ color: "#0E0F12" }}
              >
                {result.setupUrl}
              </p>
              <button
                type="button"
                onClick={copyUrl}
                className="flex shrink-0 items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: copied ? "#DCFCE7" : "#0066FF",
                  color: copied ? "#15803D" : "white",
                  border: copied ? "1px solid #BBF7D0" : "none",
                }}
              >
                {copied ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
