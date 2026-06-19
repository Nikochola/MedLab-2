"use client"

import { useRef, useState, useCallback } from "react"
import { ECGDisplay, ECGDisplayHandle } from "@/components/ecg/ECGDisplay"
import { ECGWaveformParams, generateRandomECGParams } from "@/components/ecg/ECGWaveformGenerator"

const RHYTHMS = ["normal", "afib", "bradycardia", "tachycardia"] as const

const PRESETS: { label: string; params: ECGWaveformParams }[] = [
  { label: "Normal Sinus", params: { heartRate: 75, rhythm: "normal", abnormalities: {} } },
  { label: "Sinus Brady", params: { heartRate: 50, rhythm: "bradycardia", abnormalities: {} } },
  { label: "Sinus Tachy", params: { heartRate: 110, rhythm: "tachycardia", abnormalities: {} } },
  { label: "Afib", params: { heartRate: 120, rhythm: "afib", abnormalities: { stDepression: true } } },
  { label: "STEMI", params: { heartRate: 95, rhythm: "normal", abnormalities: { stElevation: true } } },
  { label: "Prior MI", params: { heartRate: 90, rhythm: "normal", abnormalities: { qWaves: true, tWaveInversion: true } } },
  { label: "SVT", params: { heartRate: 160, rhythm: "tachycardia", abnormalities: {} } },
  { label: "AV Block III", params: { heartRate: 35, rhythm: "bradycardia", abnormalities: { qWaves: true } } },
]

const ABNORMALITY_LABELS: { key: keyof NonNullable<ECGWaveformParams["abnormalities"]>; label: string }[] = [
  { key: "stElevation", label: "ST Elevation" },
  { key: "stDepression", label: "ST Depression" },
  { key: "qWaves", label: "Q Waves" },
  { key: "tWaveInversion", label: "T-Wave Inversion" },
  { key: "leftAxis", label: "Left Axis Deviation" },
  { key: "rightAxis", label: "Right Axis Deviation" },
]

export default function ECGGeneratorPage() {
  const [params, setParams] = useState<ECGWaveformParams>({
    heartRate: 75,
    rhythm: "normal",
    duration: 10,
    sampleRate: 500,
    abnormalities: {},
  })
  const [zoom, setZoom] = useState(1)
  const displayRef = useRef<ECGDisplayHandle>(null)

  const handleDownload = useCallback(() => {
    const canvas = displayRef.current?.getCanvas()
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    const rhythm = params.rhythm ?? "normal"
    const hr = params.heartRate ?? 75
    a.download = `ecg_${rhythm}_${hr}bpm.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [params])

  const handleRandom = useCallback(() => {
    setParams({ ...generateRandomECGParams(), duration: 10, sampleRate: 500 })
  }, [])

  const setAbnormality = useCallback(
    (key: keyof NonNullable<ECGWaveformParams["abnormalities"]>, value: boolean) => {
      setParams((prev) => ({
        ...prev,
        abnormalities: { ...prev.abnormalities, [key]: value },
      }))
    },
    []
  )

  const applyPreset = useCallback((preset: ECGWaveformParams) => {
    setParams({ ...preset, duration: 10, sampleRate: 500 })
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">ECG Generator</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Internal tool — generate and export 12-lead ECGs as PNG</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRandom}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Random
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-1.5 text-sm rounded-md bg-rose-600 hover:bg-rose-500 transition-colors font-medium"
          >
            Download PNG
          </button>
        </div>
      </div>

      <div className="flex gap-0 min-h-[calc(100vh-61px)]">
        {/* Controls sidebar */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 p-5 flex flex-col gap-6 overflow-y-auto">

          {/* Presets */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Presets</h2>
            <div className="flex flex-col gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.params)}
                  className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    params.heartRate === p.params.heartRate && params.rhythm === p.params.rhythm
                      ? "bg-rose-900/60 text-rose-200 border border-rose-700/50"
                      : "hover:bg-zinc-800 text-zinc-300 border border-transparent"
                  }`}
                >
                  {p.label}
                  <span className="ml-2 text-xs text-zinc-500">{p.params.heartRate} bpm</span>
                </button>
              ))}
            </div>
          </section>

          {/* Heart Rate */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Heart Rate</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={35}
                max={170}
                step={1}
                value={params.heartRate ?? 75}
                onChange={(e) => setParams((prev) => ({ ...prev, heartRate: Number(e.target.value) }))}
                className="flex-1 accent-rose-500"
              />
              <span className="text-sm font-mono w-14 text-right text-zinc-200">
                {params.heartRate} bpm
              </span>
            </div>
          </section>

          {/* Rhythm */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Rhythm</h2>
            <div className="flex flex-col gap-1">
              {RHYTHMS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="rhythm"
                    value={r}
                    checked={params.rhythm === r}
                    onChange={() => setParams((prev) => ({ ...prev, rhythm: r }))}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-zinc-300 capitalize group-hover:text-zinc-100 transition-colors">
                    {r === "afib" ? "Atrial Fibrillation" : r.charAt(0).toUpperCase() + r.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Abnormalities */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Abnormalities</h2>
            <div className="flex flex-col gap-2">
              {ABNORMALITY_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!params.abnormalities?.[key]}
                    onChange={(e) => setAbnormality(key, e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Zoom */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">View Zoom</h2>
            <div className="flex items-center gap-2">
              {[1, 1.5, 2, 3].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`flex-1 py-1 rounded text-xs font-mono transition-colors ${
                    zoom === z
                      ? "bg-rose-700 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {z}×
                </button>
              ))}
            </div>
          </section>

          {/* Current params summary */}
          <section className="mt-auto pt-4 border-t border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Export Info</h2>
            <p className="text-xs text-zinc-500 font-mono leading-relaxed">
              {params.heartRate} bpm · {params.rhythm}
              {Object.entries(params.abnormalities ?? {})
                .filter(([, v]) => v)
                .map(([k]) => ` · ${k}`)
                .join("")}
            </p>
            <p className="text-xs text-zinc-600 mt-1 font-mono">10 sec · 500 Hz · 12-lead PNG</p>
          </section>
        </aside>

        {/* ECG display area */}
        <main className="flex-1 overflow-auto p-6">
          <ECGDisplay
            ref={displayRef}
            params={params}
            zoom={zoom}
            fitToContainer
          />
        </main>
      </div>
    </div>
  )
}
