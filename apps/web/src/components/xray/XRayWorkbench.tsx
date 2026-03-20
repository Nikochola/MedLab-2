"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Info,
  ScanSearch,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  XRayGenerateResponse,
  XRayMarker,
  XRayPathologyType,
  XRayProvenance,
  XRaySeverity,
  XRayView,
} from "@/lib/xray/types"
import { XRAY_WARNING_TEXT } from "@/lib/xray/types"
import { XRayDoctorPanel } from "@/components/simulation/XRayDoctorPanel"
import { XRayAssessmentForm } from "@/components/case-based/XRayAssessmentForm"
import { useAuth } from "@/contexts/AuthContext"

type Mode = "simulation" | "case-based"
type XRayInterpretationStep = "view-and-quality" | "primary-pattern" | "localization" | "impression"

export interface XRayCase {
  id: string
  diagnosis: string
  patient: string
  history: string
  indication: string
  technicalQuality: string
  findings: string[]
  impressionOptions: string[]
  correctImpression: string
  teachingPearl: string
  pathology: XRayPathologyType
  severity: XRaySeverity
  view: XRayView
}

const XRAY_CASES: XRayCase[] = [
  {
    id: "c1",
    diagnosis: "Right Lower Lobe Pneumonia",
    patient: "21-year-old female",
    history: "3 days of fever, productive cough, right pleuritic chest pain.",
    indication: "Evaluate for infectious infiltrate",
    technicalQuality: "PA + lateral, adequate inspiration",
    findings: ["Patchy right lower lobe airspace opacity", "Mild air bronchograms", "No pleural effusion"],
    impressionOptions: ["Right lower lobe pneumonia", "Pulmonary edema", "Large right pleural effusion", "Normal chest radiograph"],
    correctImpression: "Right lower lobe pneumonia",
    teachingPearl: "Localized opacity with air bronchograms strongly supports lobar pneumonia.",
    pathology: "pneumonia",
    severity: "moderate",
    view: "PA",
  },
  {
    id: "c2",
    diagnosis: "Left Pleural Effusion",
    patient: "66-year-old male",
    history: "Progressive dyspnea and orthopnea.",
    indication: "Assess volume status and pleural spaces",
    technicalQuality: "Portable AP, mild rotation",
    findings: ["Blunting of the left costophrenic angle", "Meniscus sign at left lung base", "Mild adjacent compressive atelectasis"],
    impressionOptions: ["Left pleural effusion with adjacent atelectasis", "Tension pneumothorax", "Right lower lobe collapse", "Diffuse pulmonary fibrosis"],
    correctImpression: "Left pleural effusion with adjacent atelectasis",
    teachingPearl: "A meniscus contour and costophrenic blunting are classic clues for pleural fluid.",
    pathology: "pleural_effusion",
    severity: "moderate",
    view: "AP",
  },
  {
    id: "c3",
    diagnosis: "Mild Cardiomegaly",
    patient: "58-year-old female",
    history: "Fatigue and lower-extremity edema.",
    indication: "Screen cardiac silhouette and pulmonary vasculature",
    technicalQuality: "PA view, acceptable exposure",
    findings: ["Enlarged cardiomediastinal silhouette", "Mild central vascular prominence", "No focal airspace consolidation"],
    impressionOptions: ["Mild cardiomegaly with vascular prominence", "Acute lobar pneumonia", "Normal cardiac silhouette", "Large pericardial effusion"],
    correctImpression: "Mild cardiomegaly with vascular prominence",
    teachingPearl: "Cardiothoracic ratio enlargement should be interpreted in context of projection and rotation.",
    pathology: "cardiomegaly",
    severity: "mild",
    view: "PA",
  },
  {
    id: "c4",
    diagnosis: "Small Right Apical Pneumothorax",
    patient: "24-year-old male",
    history: "Sudden pleuritic pain after exercise.",
    indication: "Rule out pneumothorax",
    technicalQuality: "PA upright, good inspiration",
    findings: ["Thin right apical pleural line", "No significant mediastinal shift", "No pleural effusion"],
    impressionOptions: ["Small right apical pneumothorax", "Right upper lobe pneumonia", "Pulmonary embolism pattern", "No acute cardiopulmonary abnormality"],
    correctImpression: "Small right apical pneumothorax",
    teachingPearl: "Visible pleural line with absent peripheral lung markings indicates pneumothorax.",
    pathology: "pneumothorax",
    severity: "mild",
    view: "PA",
  },
]

const XRAY_STEPS: XRayInterpretationStep[] = ["view-and-quality", "primary-pattern", "localization", "impression"]

const STEP_HINTS: Record<XRayInterpretationStep, string[]> = {
  "view-and-quality": [
    "Look at the scapula position and cardiac magnification for AP vs PA clues.",
    "Portable studies are commonly AP and may look more magnified.",
    "State both projection and image quality briefly.",
  ],
  "primary-pattern": [
    "Think in categories: normal, consolidation, effusion, pneumothorax, cardiomegaly.",
    "Use objective signs such as pleural line, meniscus, or enlarged silhouette.",
    "One strongest pattern is enough for this step.",
  ],
  localization: [
    "Describe side and region: apical, lower lobe, or costophrenic angle.",
    "Use markers and distribution rather than broad guesses.",
    "If normal, say no focal abnormality.",
  ],
  impression: [
    "Keep this concise and diagnosis-oriented.",
    "Include severity language when visible.",
    "Use training wording, not clinical directives.",
  ],
}

function randomSeed() {
  return Math.floor(Math.random() * 2_147_483_647)
}

function seedFromCase(caseId: string) {
  let hash = 0
  for (let i = 0; i < caseId.length; i += 1) {
    hash = (hash << 5) - hash + caseId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) + 1009
}

function getRandomCase(excludeId?: string) {
  const pool = excludeId ? XRAY_CASES.filter((item) => item.id !== excludeId) : XRAY_CASES
  return pool[Math.floor(Math.random() * pool.length)] ?? XRAY_CASES[0]
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function expectedTokens(pathology: XRayPathologyType) {
  if (pathology === "normal") return ["normal", "no acute", "no focal", "no finding"]
  if (pathology === "pneumonia") return ["pneumonia", "consolidation", "infiltrate", "airspace"]
  if (pathology === "pleural_effusion") return ["effusion", "pleural fluid", "meniscus", "costophrenic"]
  if (pathology === "pneumothorax") return ["pneumothorax", "pleural line", "apical"]
  return ["cardiomegaly", "enlarged heart", "cardiothoracic", "cardiac silhouette"]
}

function locationTokens(pathology: XRayPathologyType) {
  if (pathology === "normal") return ["no focal", "clear", "no acute"]
  if (pathology === "pneumonia") return ["lower", "lobe", "mid", "airspace"]
  if (pathology === "pleural_effusion") return ["costophrenic", "base", "pleural", "meniscus"]
  if (pathology === "pneumothorax") return ["apical", "apex", "peripheral"]
  return ["cardiac", "silhouette", "mediastinal", "central"]
}

export function XRayWorkbench({
  initialMode = "simulation",
  modality = "XRAY",
  presetCase,
}: {
  initialMode?: Mode,
  modality?: "XRAY" | "CT"
  presetCase?: XRayCase
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [currentCase, setCurrentCase] = useState<XRayCase>(() => presetCase ?? getRandomCase())
  const { setWorkbenchMode } = useAuth()
  const router = useRouter()

  const [view, setView] = useState<XRayView>(currentCase.view)
  const [pathology, setPathology] = useState<XRayPathologyType>(currentCase.pathology)
  const [severity, setSeverity] = useState<XRaySeverity>(currentCase.severity)
  const [source, setSource] = useState<"synthetic" | "real">("real")

  const [seed, setSeed] = useState<number>(() => randomSeed())
  const [currentStep, setCurrentStep] = useState<XRayInterpretationStep>(XRAY_STEPS[0])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  // Enter workbench mode on mount, exit on unmount
  useEffect(() => {
    setWorkbenchMode(true)
    return () => setWorkbenchMode(false)
  }, [setWorkbenchMode])

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const effectiveSeed = useMemo(() => {
    if (mode === "case-based") return seedFromCase(currentCase.id)
    return seed
  }, [mode, currentCase.id, seed])

  const generateImage = useCallback(async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/xray/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          view,
          pathology,
          severity,
          seed: effectiveSeed,
          count: 1,
          source,
          modality
        }),
      })
      if (response.ok) {
        const data = await response.json() as XRayGenerateResponse
        setImageUrl(data.images[0]?.url ?? null)
      }
    } catch (error) {
      console.error("X-ray generation failed.")
    } finally {
      setIsGenerating(false)
    }
  }, [effectiveSeed, pathology, severity, view, source])

  useEffect(() => {
    generateImage()
  }, [generateImage])

  // Reset pan when zoom resets to 1
  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 })
  }, [zoom])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [zoom, pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    setPan({ x: panStart.current.x + (e.clientX - dragStart.current.x), y: panStart.current.y + (e.clientY - dragStart.current.y) })
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const nudgeZoom = (delta: number) => {
    setZoom((value) => Math.min(3, Math.max(1, Number((value + delta).toFixed(2)))))
  }

  const handleExit = () => {
    router.push("/ecg")
  }

  const handleAnswerSubmit = async (answer: string): Promise<{ isCorrect: boolean; message: string; explanation?: string }> => {
    let isCorrect = false
    let message = ""
    let explanation: string | undefined

    try {
      const response = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswer: answer,
          question: `Step: ${currentStep}. Pathology: ${pathology}, Severity: ${severity}, View: ${view}.`,
          context: `Patient study with ${pathology} (${severity} severity) in ${view} projection.`,
          specialty: "Chest X-Ray Radiology",
        }),
      })

      if (response.ok) {
        const aiResult = await response.json()
        isCorrect = aiResult.isCorrect
        message = aiResult.feedback
        explanation = aiResult.explanation
      }
    } catch (error) {
      console.error("AI validation failed, using rule-based fallback")
    }

    if (!message) {
      const normalizedAnswer = normalizeText(answer)
      if (currentStep === "view-and-quality") {
        isCorrect = normalizedAnswer.includes(view.toLowerCase())
        message = isCorrect ? `Correct. Study is ${view}.` : `Identify the projection (${view}).`
        explanation = "Check the orientation of scapulae and heart shape."
      } else if (currentStep === "primary-pattern") {
        const tokens = expectedTokens(pathology)
        isCorrect = tokens.some(t => normalizedAnswer.includes(t))
        message = isCorrect ? "Correct identification." : "Look for the dominant pathology pattern."
      } else if (currentStep === "localization") {
        const tokens = locationTokens(pathology)
        isCorrect = tokens.some(t => normalizedAnswer.includes(t))
        message = isCorrect ? "Correct localization." : "Specify the side or lobe affected."
      } else {
        const tokens = expectedTokens(pathology)
        isCorrect = tokens.some(t => normalizedAnswer.includes(t))
        message = isCorrect ? "Accurate impression." : "Refine your final diagnostic impression."
      }
    }

    return { isCorrect, message, explanation }
  }

  const handleStepComplete = () => {
    const currentIndex = XRAY_STEPS.indexOf(currentStep)
    if (currentIndex < XRAY_STEPS.length - 1) {
      setCurrentStep(XRAY_STEPS[currentIndex + 1])
    } else {
      const nextCase = getRandomCase(currentCase.id)
      setCurrentCase(nextCase)
      setView(nextCase.view)
      setPathology(nextCase.pathology)
      setSeverity(nextCase.severity)
      setCurrentStep(XRAY_STEPS[0])
      setSeed(randomSeed())
    }
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Session topbar */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 56, borderBottom: "1px solid #E8E6DF" }}
      >
        <div className="flex items-center gap-3">
          <ScanSearch className="h-4 w-4" style={{ color: "#0066FF" }} />
          <span className="text-sm font-semibold" style={{ color: "#0E0F12" }}>
            {modality === "CT" ? "Chest CT" : "X-Ray"} {mode === "simulation" ? "Simulation" : "Case Study"}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "#EEF3FF", color: "#0066FF" }}>
            {mode === "simulation" ? `Step ${XRAY_STEPS.indexOf(currentStep) + 1}/${XRAY_STEPS.length}` : "In Progress"}
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 rounded-[9px] px-3 py-2 text-xs font-medium transition-colors"
          style={{ color: "#6B6A65", border: "1px solid #E8E6DF" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F5F5F3"; e.currentTarget.style.borderColor = "#D8D5CC" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#E8E6DF" }}
        >
          <X className="h-3.5 w-3.5" />
          Exit Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT PANEL: AI Tutor or Case Info */}
        <div
          className="w-full lg:w-[400px] flex-shrink-0 overflow-y-auto"
          style={{ borderRight: "1px solid #E8E6DF" }}
        >
          {mode === "simulation" ? (
            <XRayDoctorPanel
              currentStep={currentStep}
              onAnswerSubmit={handleAnswerSubmit}
              onStepComplete={handleStepComplete}
              hints={STEP_HINTS}
              view={view}
              pathology={pathology}
              severity={severity}
            />
          ) : (
            <div className="flex flex-col p-6 space-y-5 h-full">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#9B9A94" }}>Medical History</p>
                <h2 className="text-xl font-semibold" style={{ color: "#0E0F12" }}>{currentCase.patient}</h2>
                <p className="text-sm mt-1" style={{ color: "#6B6A65" }}>{currentCase.history}</p>
              </div>

              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "#EEF3FF", border: "1px solid #C7D9FF" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Info className="h-3.5 w-3.5" style={{ color: "#0066FF" }} />
                  <span className="text-xs font-semibold" style={{ color: "#0066FF" }}>Indication</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#0E0F12" }}>{currentCase.indication}</p>
              </div>

              <div className="flex-1 flex items-center justify-center rounded-xl px-4 py-6" style={{ border: "1px dashed #E8E6DF" }}>
                <div className="text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" style={{ color: "#9B9A94" }} />
                  <p className="text-xs" style={{ color: "#9B9A94" }}>{XRAY_WARNING_TEXT}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MAIN AREA: X-Ray Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
            <button
              onClick={() => nudgeZoom(0.25)}
              className="flex items-center justify-center h-9 w-9 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ZoomIn className="h-4 w-4 text-white/60" />
            </button>
            <button
              onClick={() => nudgeZoom(-0.25)}
              className="flex items-center justify-center h-9 w-9 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ZoomOut className="h-4 w-4 text-white/60" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-8 overflow-hidden"
            style={{ cursor: zoom > 1 ? (isDragging.current ? "grabbing" : "grab") : "default" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin h-6 w-6 text-white/40" />
                <p className="text-xs font-medium text-white/30">Loading image...</p>
              </div>
            ) : imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Chest X-Ray"
                  className="max-w-full max-h-full rounded-lg"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    transition: isDragging.current ? "none" : "transform 0.1s ease-out",
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-white/20">No image loaded</p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Case-based Mode Assessment Form */}
        {mode === "case-based" && (
          <div
            className="w-full lg:w-[380px] flex-shrink-0 overflow-y-auto"
            style={{ borderLeft: "1px solid #E8E6DF" }}
          >
            <XRayAssessmentForm patientCase={currentCase} xrayFindings={{ pathology, severity, view }} />
          </div>
        )}
      </div>
    </div>
  )
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
