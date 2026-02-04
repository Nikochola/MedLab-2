"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { ECGDisplay } from "@/components/ecg/ECGDisplay"
import { generateRandomECGParams, ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SOURCE_LABELS: Record<string, string> = {
  json: "JSON",
  ai: "AI",
  "rule-based": "Rule-based",
  random: "Random defaults",
}

export default function TeacherECGGeneratorPage() {
  const [prompt, setPrompt] = useState("")
  const [ecgParams, setEcgParams] = useState<ECGWaveformParams>(generateRandomECGParams())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)

  const handleGenerate = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setError("Enter a prompt for the ECG generator.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/ecg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      })

      if (!response.ok) {
        const message = await response.json().catch(() => ({}))
        throw new Error(message?.error || "Failed to generate ECG parameters")
      }

      const result = await response.json()
      if (result?.params) {
        setEcgParams(result.params)
        setSource(result.source || null)
      } else {
        throw new Error("Invalid ECG parameters returned")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate ECG"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExample = (value: string) => {
    setPrompt(value)
  }

  return (
    <ProtectedRoute requiredRole="teacher">
      <div className="min-h-screen bg-transparent">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Teacher Only</p>
            <h1 className="text-3xl font-bold text-slate-900">ECG Prompt Generator</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Describe the pattern you want. We will translate it into parameters and render the ECG using the existing
              simulator.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Prompt</CardTitle>
                <CardDescription>
                  Include disease names or features like rhythm, rate, ST changes, or axis. You can also paste JSON.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  rows={8}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: Inferior STEMI with ST elevation, HR 92, sinus regular"
                  className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />

                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleExample("Atrial fibrillation with RVR, irregular rhythm, HR 130")}
                    className="rounded-full border border-border/70 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-400"
                  >
                    A-fib RVR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExample("Anterior STEMI with ST elevation, HR 98, sinus regular")}
                    className="rounded-full border border-border/70 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-400"
                  >
                    STEMI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExample("Left axis deviation, sinus bradycardia, HR 52")}
                    className="rounded-full border border-border/70 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-400"
                  >
                    L-axis + Brady
                  </button>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center gap-3">
                  <Button type="button" onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? "Generating..." : "Generate ECG"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPrompt("")
                      setSource(null)
                      setError(null)
                    }}
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                </div>

                {source && (
                  <div className="rounded-lg border border-border/70 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Source: <span className="font-semibold text-slate-800">{SOURCE_LABELS[source] || source}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  The ECG updates after each generation. This uses the same waveform engine as the student simulator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ECGDisplay params={ecgParams} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
