"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ECGDisplay } from "@/components/ecg/ECGDisplay"
import type { ECGWaveformParams } from "@/components/ecg/ECGWaveformGenerator"

// ── Figma asset URLs ─────────────────────────────────────────────────────────
const CLIP_SVG = "https://www.figma.com/api/mcp/asset/1603a692-fb9d-47b9-9de9-6f3e52af5e1c"
const ARROW_SVG = "https://www.figma.com/api/mcp/asset/42c5211f-1f7e-451e-a7f6-2e24d1011444"
const TUBE_RED = "https://www.figma.com/api/mcp/asset/79a08e3e-5d39-4338-8f00-1b1972465470"
const TUBE_GREEN = "https://www.figma.com/api/mcp/asset/65157f5d-b177-4fd6-afcb-715d6b6a0261"
const LIGHT_RED = "https://www.figma.com/api/mcp/asset/bb40a357-676d-4473-9f4f-5cde3d5fd4d8"
const LIGHT_GREEN = "https://www.figma.com/api/mcp/asset/79f77222-1d4f-4851-bcc0-7a3afa7d72b1"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabResult {
  name: string; value: string; unit: string; flag?: "high" | "low" | "critical"
}

export interface WorkupCase {
  chiefComplaint: string
  age: number
  gender: "male" | "female"
  history: string
  pastMedicalHistory: string
  auscultation: { heart: string; lungs: string }
  vitals: { bp: string; hr: number; rr: number; temp: string; spo2: string }
  labResults: LabResult[]
  ecgParams: ECGWaveformParams
  teachingPoints: string[]
  expectedDiagnosis: string
}

const TOOLS = [
  { id: "history", label: "Patient History" },
  { id: "vitals", label: "Vital Signs" },
  { id: "auscultate", label: "Auscultation" },
  { id: "ecg", label: "Order ECG" },
  { id: "bloods", label: "Blood Panel" },
] as const

type ToolId = (typeof TOOLS)[number]["id"]

// ── Shared font stacks ───────────────────────────────────────────────────────
const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Instrument Sans', sans-serif"

// ── Buttons ───────────────────────────────────────────────────────────────────

function PrimaryBtn({ onClick, disabled, loading, children, className = "" }: {
  onClick?: () => void; disabled?: boolean; loading?: boolean
  children: React.ReactNode; className?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-[#0047CC] bg-[#0066FF] px-4 font-semibold text-white shadow-[0_3px_0_#0047CC] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-40 ${className}`}>
      {loading ? "Loading…" : children}
    </button>
  )
}

function GhostBtn({ onClick, children, className = "" }: {
  onClick?: () => void; children: React.ReactNode; className?: string
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-[#D8D5CC] bg-[#F8F7F2] font-semibold text-[#0E0F12] shadow-[0_3px_0_#D8D5CC] transition-transform active:translate-y-[3px] active:shadow-none ${className}`}>
      {children}
    </button>
  )
}

// ── ECG Monitor (top half of capsule) ─────────────────────────────────────────

function ECGMonitorPanel({ unlocked, params, onUnlock }: {
  unlocked: boolean; params: ECGWaveformParams; onUnlock: () => void
}) {
  return (
    <div
      className="relative flex flex-1 cursor-pointer overflow-hidden transition-all duration-300"
      onClick={() => !unlocked && onUnlock()}
      style={{
        backgroundColor: "#1c1c22", // Darker, premium plastic base
        borderRadius: "40px 40px 0 0", // Slightly squarer for realism
        boxShadow: `
          inset 0 4px 6px -1px rgba(255, 255, 255, 0.1),
          inset 0 -8px 20px rgba(0,0,0,0.6),
          0 10px 30px -5px rgba(0,0,0,0.4),
          inset 2px 0 4px rgba(255,255,255,0.05),
          inset -2px 0 4px rgba(0,0,0,0.4)
        `,
        borderTop: "1px solid rgba(255,255,255,0.15)",
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        borderRight: "1px solid rgba(0,0,0,0.8)",
      }}
    >
      {/* Matte surface texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"
      }} />

      {/* Vertical label (re-styled as stamped metal tag) */}
      <div className="flex shrink-0 items-center justify-center relative z-10" style={{ width: 44 }}>
        <div style={{
          backgroundColor: "#16161b",
          padding: "20px 6px",
          borderRadius: "12px",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.1)",
          border: "1px solid #111"
        }}>
          <p className="select-none" style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 10,
            fontFamily: MONO,
            fontWeight: 600,
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            color: "#6b6f7a",
            textShadow: "0 -1px 1px rgba(0,0,0,0.8)"
          }}>ECG Chart</p>
        </div>
      </div>

      {/* Screen - deeply recessed */}
      <div className="relative my-4 flex-1 overflow-hidden" style={{
        backgroundColor: unlocked ? "#030406" : "#221111", // Deep OLED black
        borderRadius: "8px",
        boxShadow: `
          inset 0 10px 20px rgba(0,0,0,1),
          inset 0 0 15px rgba(0,0,0,0.8),
          0 1px 0 rgba(255,255,255,0.1)
        `,
        border: "2px solid #08080a"
      }}>
        {/* Glass glare effect */}
        <div className="absolute inset-0 pointer-events-none z-20" style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 100%)",
          borderRadius: "8px"
        }} />
        <div className="absolute inset-0 pointer-events-none z-20 opacity-30" style={{
          background: "radial-gradient(ellipse at top, rgba(255,255,255,0.15) 0%, transparent 60%)"
        }} />

        {/* CRT scan lines */}
        <div className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)",
        }} />

        {/* Subtle grid base glow */}
        {unlocked && (
          <div className="absolute inset-0 pointer-events-none z-0" style={{
            boxShadow: "inset 0 0 40px rgba(0, 255, 0, 0.05)"
          }} />
        )}

        {unlocked ? (
          <div className="relative z-0 h-full w-full" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,0,0.3))" }}>
            <ECGDisplay params={params} zoom={1} fitToContainer />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 relative z-10">
            <svg viewBox="0 0 280 50" className="w-full max-w-[200px]" style={{ filter: "drop-shadow(0 0 6px rgba(255,0,0,0.6))" }}>
              <polyline points="0,25 70,25 82,5 94,45 106,5 118,25 280,25"
                fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <p className="animate-pulse" style={{
              fontSize: 10, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.2em",
              color: "#ef4444", textTransform: "uppercase", textShadow: "0 0 8px rgba(239, 68, 68, 0.6)"
            }}>
              Tap to init module
            </p>
          </div>
        )}
      </div>

      {/* LEDs panel */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-4 pr-5 pl-4 relative z-10">
        <div className="relative">
          {/* Recessed hole for LED */}
          <div className="absolute -inset-1 rounded-full bg-black opacity-40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] filter blur-[1px]"></div>
          <div className="relative w-7 h-7 rounded-full flex items-center justify-center" style={{
            background: !unlocked ? "radial-gradient(circle at 30% 30%, #ff8080, #dc2626)" : "radial-gradient(circle at 30% 30%, #551111, #220000)",
            boxShadow: !unlocked
              ? "0 0 15px 2px rgba(220, 38, 38, 0.8), inset 0 2px 4px rgba(255,255,255,0.4)"
              : "inset 0 2px 4px rgba(0,0,0,0.6)",
            border: "1px solid #111"
          }}>
            {/* LED Specular Highlight */}
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white opacity-40 blur-[1px]"></div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-black opacity-40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] filter blur-[1px]"></div>
          <div className="relative w-7 h-7 rounded-full flex items-center justify-center" style={{
            background: unlocked ? "radial-gradient(circle at 30% 30%, #86efac, #16a34a)" : "radial-gradient(circle at 30% 30%, #113311, #001100)",
            boxShadow: unlocked
              ? "0 0 15px 2px rgba(34, 197, 94, 0.8), inset 0 2px 4px rgba(255,255,255,0.6)"
              : "inset 0 2px 4px rgba(0,0,0,0.6)",
            border: "1px solid #111"
          }}>
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white opacity-40 blur-[1px]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Blood Work (bottom half of capsule) ───────────────────────────────────────

function BloodWorkPanel({ unlocked, results, onUnlock }: {
  unlocked: boolean; results: LabResult[]; onUnlock: () => void
}) {
  return (
    <div
      className="relative flex flex-1 cursor-pointer overflow-hidden transition-all duration-300"
      onClick={() => !unlocked && onUnlock()}
      style={{
        backgroundColor: "#f4f4f6", // More realistic polished plastic
        borderRadius: "0 0 40px 40px",
        boxShadow: `
          inset 0 -10px 20px rgba(0,0,0,0.1),
          inset 0 -1px 3px rgba(0,0,0,0.2),
          inset 2px 0 4px rgba(255,255,255,1),
          inset -2px 0 4px rgba(0,0,0,0.05),
          0 10px 30px -5px rgba(0,0,0,0.3)
        `,
        borderTop: "1px solid #111", // Seam where it meets the black monitor
        borderBottom: "1px solid rgba(0,0,0,0.2)",
        borderLeft: "1px solid rgba(255,255,255,0.8)",
        borderRight: "1px solid rgba(0,0,0,0.1)"
      }}
    >
      {/* Plastic reflection */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.02) 100%)",
        borderRadius: "0 0 40px 40px"
      }} />

      {/* Vacutainer tubes - sitting in a recessed slot */}
      <div className="flex shrink-0 items-end gap-1.5 pl-8 pb-6 relative z-10">
        <div className="absolute -bottom-2 -left-2 w-32 h-6 bg-black/20 blur-[8px] rounded-full mix-blend-multiply"></div>
        <img src={TUBE_RED} alt="" style={{ height: 140, filter: "drop-shadow(3px 5px 6px rgba(0,0,0,0.3))" }} />
        <img src={TUBE_GREEN} alt="" style={{ height: 140, filter: "drop-shadow(3px 5px 6px rgba(0,0,0,0.3))" }} />
      </div>

      {/* Content Container (Printed Receipt sitting in a tray) */}
      <div className="flex flex-1 flex-col justify-center px-6 relative z-10">
        {/* The receipt itself */}
        <div className="relative rounded-lg p-5 transition-all duration-500" style={{
          backgroundColor: unlocked ? "#fffcf8" : "transparent",
          boxShadow: unlocked
            ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 10px 25px -5px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.05)"
            : "none",
          transform: unlocked ? "translateY(0)" : "translateY(4px)",
        }}>
          {unlocked && (
            <div className="absolute top-0 left-0 right-0 h-1" style={{
              background: "repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 8px)"
            }} />
          )}

          <div className="flex items-start justify-between mb-3" style={{ borderBottom: unlocked ? "2px dotted rgba(0,0,0,0.1)" : "none", paddingBottom: 8 }}>
            <div>
              <p style={{ fontSize: 8, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.22em", color: "#a89f91", textTransform: "uppercase" }}>
                Clinical Laboratory
              </p>
              <p className="mt-1 font-medium" style={{ fontSize: 16, color: "#3a3a3a", fontFamily: SANS, textShadow: "0 1px 1px rgba(255,255,255,0.8)" }}>
                Blood Work – Test Results
              </p>
            </div>
            {/* Barcode */}
            {unlocked && (
              <div className="flex items-end gap-px mt-1 mix-blend-multiply" style={{ opacity: 0.3 }}>
                {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1].map((w, i) => (
                  <div key={i} style={{ width: w, height: 28, backgroundColor: "#1a1a1a", flexShrink: 0 }} />
                ))}
              </div>
            )}
          </div>

          {unlocked ? (
            <div className="space-y-1.5 overflow-y-auto pr-2" style={{ maxHeight: 110 }}>
              {results.map((r) => {
                const isCrit = r.flag === "critical"
                const isHigh = r.flag === "high"
                const isLow = r.flag === "low"
                const col = isCrit ? "#b91c1c" : isHigh ? "#b45309" : isLow ? "#1d4ed8" : "#4b5563"
                return (
                  <div key={r.name} className="flex items-center justify-between"
                    style={{ fontSize: 12, fontFamily: MONO, borderBottom: "1px dashed rgba(0,0,0,0.06)", paddingBottom: 4, paddingTop: 4 }}>
                    <span style={{ color: "#737373", fontWeight: 500 }}>{r.name}</span>
                    <span className="flex items-center gap-1.5 font-bold tabular-nums" style={{ color: col }}>
                      {r.value} <span style={{ opacity: 0.7, fontSize: 10, fontWeight: 500 }}>{r.unit}</span>
                      {isHigh && <TrendingUp style={{ width: 12, height: 12 }} />}
                      {isLow && <TrendingDown style={{ width: 12, height: 12 }} />}
                      {isCrit && (
                        <span style={{ fontSize: 8, fontWeight: 900, backgroundColor: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 4, padding: "2px 5px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>CRIT</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", fontFamily: SANS, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tap to order blood panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Patient History (manila folder + rotated paper) ───────────────────────────

function PatientHistoryPanel({ unlocked, workupCase, onUnlock }: {
  unlocked: boolean; workupCase: WorkupCase; onUnlock: () => void
}) {
  return (
    <div className="relative h-full cursor-pointer transition-transform duration-300 hover:scale-[1.01]" onClick={() => !unlocked && onUnlock()}>
      {/* Manila folder - Textured Cardboard */}
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(135deg, #e4c172 0%, #dbb662 50%, #cca54d 100%)",
        borderRadius: "4px 24px 8px 8px", // Resembling a real tabbed folder
        transform: "rotate(-1.5deg) translateY(2px)",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.1), 0 8px 24px -4px rgba(0,0,0,0.2)",
        border: "1px solid rgba(0,0,0,0.1)"
      }}>
        {/* Noise texture for cardboard */}
        <div className="absolute inset-0 opacity-10 mix-blend-multiply" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"1.5\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"
        }} />
      </div>

      {/* White paper (rotated) */}
      <div className="absolute inset-[8px] overflow-hidden p-6 transition-all duration-300" style={{
        backgroundColor: "#fdfdfa",
        borderRadius: "2px",
        transform: unlocked ? "rotate(2deg)" : "rotate(3deg) translateY(4px)",
        boxShadow: "-4px 6px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        {/* Faint ruled lines with red margin */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-0 bottom-0 left-8 w-px bg-red-400 opacity-20" />
          <div className="absolute top-0 bottom-0 left-9 w-px bg-red-400 opacity-20" />
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(180deg, transparent, transparent 23px, rgba(59,130,246,0.1) 23px, rgba(59,130,246,0.1) 24px)",
            backgroundPositionY: 48,
          }} />
        </div>

        <div className="relative z-10 pl-6 pt-2">
          <p className="font-bold flex items-end gap-3" style={{ fontSize: 22, color: "#1f2937", fontFamily: SANS, letterSpacing: "-0.02em" }}>
            Patient History <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 500, color: "#9ca3af", letterSpacing: "0.1em", paddingBottom: 4 }}>RECORD 01</span>
          </p>

          {unlocked ? (
            <div className="mt-4 overflow-y-auto pr-2" style={{ maxHeight: "calc(100% - 40px)" }}>
              {/* Typewriter text styling */}
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", fontFamily: MONO, fontWeight: 500 }}>
                {workupCase.history}
              </p>
              <div className="mt-5 flex items-center gap-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#d97706" }}>PMH</p>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              <p className="mt-3" style={{ fontSize: 13, lineHeight: 1.7, color: "#4b5563", fontFamily: MONO }}>
                {workupCase.pastMedicalHistory}
              </p>
            </div>
          ) : (
            <div className="mt-12 flex flex-col items-center justify-center opacity-40">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              <p style={{ fontSize: 12, fontWeight: 600, fontFamily: SANS, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Tap to take history
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Checklist (clipboard) ─────────────────────────────────────────────────────

function ChecklistPanel({ usedTools, onUseTool }: {
  usedTools: Set<ToolId>; onUseTool: (id: ToolId) => void
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-start pt-8">
      {/* Premium frosted acrylic/plastic clipboard */}
      <div className="relative w-full transition-all duration-300 hover:scale-[1.01]" style={{
        backgroundImage: "linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%)",
        borderRadius: "16px",
        maxWidth: 280,
        boxShadow: "inset 0 2px 4px rgba(255,255,255,1), 0 10px 30px -5px rgba(0,0,0,0.2), inset 0 -2px 5px rgba(0,0,0,0.05)",
        border: "1px solid rgba(255,255,255,0.8)"
      }}>
        {/* Metal clip */}
        <div className="absolute left-1/2 z-10 -translate-x-1/2 drop-shadow-xl" style={{ top: -60, width: 217, height: 84 }}>
          <img src={CLIP_SVG} alt="" className="size-full" />
        </div>

        <div className="px-6 pb-6 pt-10">
          {TOOLS.map((tool, i) => {
            const checked = usedTools.has(tool.id as ToolId)
            return (
              <button
                key={tool.id}
                onClick={() => !checked && onUseTool(tool.id as ToolId)}
                disabled={checked}
                className="group flex w-full items-center justify-between py-3 my-1 transition-all duration-300 rounded-lg px-2"
                style={{
                  cursor: checked ? "default" : "pointer",
                  backgroundColor: checked ? "transparent" : "rgba(255,255,255,0.5)",
                  boxShadow: checked ? "inset 0 2px 4px rgba(0,0,0,0.05)" : "0 2px 5px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
                  border: checked ? "1px solid rgba(0,0,0,0.05)" : "1px solid rgba(0,0,0,0.1)",
                  opacity: checked ? 0.6 : 1,
                  transform: checked ? "translateY(1px)" : "none"
                }}
              >
                <span className="transition-colors duration-300" style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: checked ? "#9ca3af" : "#374151",
                  textDecoration: checked ? "line-through" : "none",
                  fontFamily: SANS,
                }}>
                  {tool.label}
                </span>
                {checked ? (
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center border border-green-200">
                    <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                      <path d="M1 5L4.5 8.5L11 1" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                    <img src={ARROW_SVG} alt="→" style={{ width: 12, height: 12, opacity: 0.6 }} className="group-hover:opacity-100" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Vital Signs (dark monitor) ────────────────────────────────────────────────

const VITAL_COLORS = {
  HR: "#22c55e", SpO2: "#22d3ee", BP: "#f59e0b", RR: "#818cf8", Temp: "#94a3b8",
}
const CRIT_COLOR = "#f87171"

function VitalSignsPanel({ unlocked, vitals, onUnlock }: {
  unlocked: boolean; vitals: WorkupCase["vitals"]; onUnlock: () => void
}) {
  const hrCrit = unlocked && (vitals.hr > 100 || vitals.hr < 60)
  const spo2Crit = unlocked && parseInt(vitals.spo2) < 95
  const rrCrit = unlocked && vitals.rr > 20

  const cells = [
    { label: "HR", value: unlocked ? String(vitals.hr) : "---", unit: "bpm", color: hrCrit ? CRIT_COLOR : VITAL_COLORS.HR, crit: hrCrit },
    { label: "SpO₂", value: unlocked ? vitals.spo2 : "--", unit: "%", color: spo2Crit ? CRIT_COLOR : VITAL_COLORS.SpO2, crit: spo2Crit },
    { label: "NIBP", value: unlocked ? vitals.bp : "--/--", unit: "mmHg", color: VITAL_COLORS.BP, crit: false },
    { label: "RR", value: unlocked ? String(vitals.rr) : "--", unit: "/min", color: rrCrit ? CRIT_COLOR : VITAL_COLORS.RR, crit: rrCrit },
    { label: "TEMP", value: unlocked ? vitals.temp : "--", unit: "", color: VITAL_COLORS.Temp, crit: false },
  ]

  return (
    <div
      className="relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300"
      onClick={() => !unlocked && onUnlock()}
      style={{
        backgroundColor: "#0d0d12", // Deep OLED black
        borderRadius: "24px",
        boxShadow: `
          inset 0 4px 10px rgba(0,0,0,1),
          0 10px 25px -5px rgba(0,0,0,0.4),
          0 0 0 4px #1c1c22, /* Physical bezel */
          0 0 0 5px rgba(255,255,255,0.1) /* Outer bezel highlight */
        `,
      }}
    >
      {/* Curved glass screen glare */}
      <div className="absolute inset-0 pointer-events-none z-20 mix-blend-screen" style={{
        background: "linear-gradient(105deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 100%)",
        borderRadius: "20px"
      }} />
      <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none z-20" style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)",
      }} />

      {/* Header bar */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-3 relative z-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="relative flex h-2 w-2">
          {unlocked && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 filter blur-[2px]" />}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: unlocked ? "#4ade80" : "#333", boxShadow: unlocked ? "0 0 8px #4ade80" : "inset 0 1px 2px rgba(0,0,0,0.8)" }} />
        </span>
        <p style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.4em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
          Vital Signs
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 flex flex-col justify-center gap-2 px-5 pb-5 pt-3 relative z-10">
        <div className="grid grid-cols-3 gap-2">
          {cells.slice(0, 3).map((c) => {
            const active = unlocked ? c.color : "rgba(255,255,255,0.04)"
            return (
              <div key={c.label} className="flex flex-col items-center rounded-xl p-3 text-center transition-all duration-300" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                borderTop: `2px solid ${active}`,
                boxShadow: unlocked ? `0 -10px 20px -10px ${active}30, inset 0 1px 0 rgba(255,255,255,0.05)` : "inset 0 1px 0 rgba(255,255,255,0.02)"
              }}>
                <p style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.3em", color: `${active}`, opacity: 0.9, textTransform: "uppercase", marginBottom: 6 }}>
                  {c.label}
                </p>
                <p style={{
                  fontSize: 28, fontWeight: 700, fontFamily: MONO, lineHeight: 1, color: active,
                  textShadow: unlocked ? `0 0 20px ${active}88, 0 0 40px ${active}44` : "none",
                }}>{c.value}</p>
                {c.unit && <p style={{ marginTop: 4, fontSize: 9, fontFamily: MONO, color: `${active}`, opacity: 0.6 }}>{c.unit}</p>}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {cells.slice(3).map((c) => {
            const active = unlocked ? c.color : "rgba(255,255,255,0.04)"
            return (
              <div key={c.label} className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-300" style={{
                background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                borderLeft: `2px solid ${active}`,
                boxShadow: unlocked ? `-10px 0 20px -10px ${active}30, inset 1px 0 0 rgba(255,255,255,0.05)` : "inset 1px 0 0 rgba(255,255,255,0.02)"
              }}>
                <p style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.3em", color: active, opacity: 0.9, textTransform: "uppercase" }}>
                  {c.label}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO, color: active, textShadow: unlocked ? `0 0 16px ${active}88` : "none" }}>
                    {c.value}
                  </p>
                  {c.unit && <p style={{ fontSize: 9, fontFamily: MONO, color: active, opacity: 0.6 }}>{c.unit}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!unlocked && (
        <p className="pb-4 text-center animate-pulse relative z-10" style={{ fontSize: 10, fontFamily: MONO, letterSpacing: "0.4em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          Tap to connect
        </p>
      )}
    </div>
  )
}

// ── Auscultation (warm paper) ─────────────────────────────────────────────────

function AuscultationPanel({ unlocked, auscultation, onUnlock }: {
  unlocked: boolean; auscultation: WorkupCase["auscultation"]; onUnlock: () => void
}) {
  return (
    <div
      className="relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:scale-[1.01]"
      onClick={() => !unlocked && onUnlock()}
      style={{
        background: "linear-gradient(135deg, #fdfaf5 0%, #f4eee2 100%)",
        borderRadius: "16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,1), 0 8px 24px -6px rgba(0,0,0,0.15), inset 0 -2px 5px rgba(0,0,0,0.02)",
        border: "1px solid rgba(0,0,0,0.05)"
      }}
    >
      {/* Heavy cardstock noise texture */}
      <div className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none" style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')"
      }} />

      <div className="relative z-10 flex h-full flex-col px-6 py-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(180deg, #fff 0%, #f3f4f6 100%)",
            border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 2px 5px rgba(0,0,0,0.08), inset 0 1px 0 white",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
              <circle cx="7" cy="10.5" r="2.5" stroke="#6b7280" strokeWidth="1.2" fill="none" />
              <path d="M3 3.5c0 0 0 2.5 2 2.5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 3.5v.8" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 6c2 0 2-2 2-2v1.5c0 1.5 0 2.5 0 2.5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-bold flex items-end gap-2" style={{ fontSize: 16, color: "#1f2937", fontFamily: SANS, letterSpacing: "-0.01em" }}>
            Auscultation <span style={{ fontSize: 9, fontFamily: MONO, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.15em", paddingBottom: 2 }}>EXAM</span>
          </p>
        </div>

        {unlocked ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {/* Debossed letterpress effect boxes */}
            <div className="transition-all duration-300 hover:bg-black/[0.02]" style={{
              background: "rgba(0,0,0,0.02)",
              borderRadius: "12px", padding: "12px 14px",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.8)",
              border: "1px solid rgba(0,0,0,0.04)"
            }}>
              <p style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.25em", textTransform: "uppercase",
                color: "#1f2937", opacity: 0.5, marginBottom: 6,
                textShadow: "0 1px 0 rgba(255,255,255,0.5)" // Letterpress text effect
              }}>Heart</p>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "#4b5563", fontFamily: SANS, fontWeight: 500 }}>{auscultation.heart}</p>
            </div>
            <div className="transition-all duration-300 hover:bg-black/[0.02]" style={{
              background: "rgba(0,0,0,0.02)",
              borderRadius: "12px", padding: "12px 14px",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.8)",
              border: "1px solid rgba(0,0,0,0.04)"
            }}>
              <p style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.25em", textTransform: "uppercase",
                color: "#1f2937", opacity: 0.5, marginBottom: 6,
                textShadow: "0 1px 0 rgba(255,255,255,0.5)" // Letterpress text effect
              }}>Lungs</p>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "#4b5563", fontFamily: SANS, fontWeight: 500 }}>{auscultation.lungs}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-40">
            <p style={{ fontSize: 12, fontWeight: 600, fontFamily: SANS, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tap to auscultate patient</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ImpressionModal({ onSubmit, onClose, isSubmitting }: {
  onSubmit: (dx: string, mgmt: string) => void; onClose: () => void; isSubmitting: boolean
}) {
  const [dx, setDx] = useState("")
  const [mgmt, setMgmt] = useState("")
  const inputS: React.CSSProperties = { border: "1.5px solid #E8E6DF", backgroundColor: "#F8F7F2", color: "#0E0F12", outline: "none" }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(14,15,18,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #F0EEE8" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9B9A94" }}>Clinical Impression</p>
          <h2 className="mt-1 text-lg font-bold" style={{ color: "#0E0F12" }}>Form your impression</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B6A65" }}>Working Diagnosis</label>
            <input value={dx} onChange={(e) => setDx(e.target.value)} placeholder="e.g. Acute anterior STEMI"
              className="h-11 w-full rounded-[9px] px-3.5 text-sm" style={inputS}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B6A65" }}>Immediate Management</label>
            <textarea value={mgmt} onChange={(e) => setMgmt(e.target.value)} rows={4}
              className="w-full rounded-[9px] px-3.5 py-3 text-sm resize-none" style={inputS}
              placeholder="e.g. Activate cath lab, dual antiplatelet…"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E8E6DF")} />
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <GhostBtn onClick={onClose} className="h-10 px-5 text-sm">Cancel</GhostBtn>
          <PrimaryBtn onClick={() => onSubmit(dx, mgmt)} disabled={!dx.trim() || !mgmt.trim()}
            loading={isSubmitting} className="h-10 flex-1 text-sm">
            Submit <ArrowRight className="h-4 w-4" />
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

function FeedbackPanel({ feedback, expectedDiagnosis, teachingPoints, onDone }: {
  feedback: { correct: boolean; response: string }; expectedDiagnosis: string; teachingPoints: string[]; onDone: () => void
}) {
  const ok = feedback.correct
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 pt-12"
      style={{ backgroundColor: "rgba(14,15,18,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-[16px]"
        style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div className="px-6 py-5" style={{ backgroundColor: ok ? "#F0FDF4" : "#FFF7ED", borderBottom: `1px solid ${ok ? "#BBF7D0" : "#FED7AA"}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: ok ? "#15803D" : "#92400E" }}>{ok ? "Correct" : "Review"}</p>
          <h2 className="mt-0.5 text-lg font-bold" style={{ color: "#0E0F12" }}>{ok ? "Well done" : "Not quite"}</h2>
          <p className="mt-1 text-xs" style={{ color: ok ? "#166534" : "#92400E" }}>Expected: <strong>{expectedDiagnosis}</strong></p>
        </div>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #F0EEE8" }}>
          <p className="text-sm leading-relaxed" style={{ color: "#0E0F12" }}>{feedback.response}</p>
        </div>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #F0EEE8" }}>
          <p style={{ marginBottom: 12, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9B9A94" }}>Teaching points</p>
          <div className="space-y-2.5">
            {teachingPoints.map((pt, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#0066FF" }} />
                <p className="text-sm leading-relaxed" style={{ color: "#6B6A65" }}>{pt}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6">
          <PrimaryBtn onClick={onDone} className="h-10 w-full text-sm">Back to track</PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export function ClinicalWorkupMode({ workupCase }: { workupCase: WorkupCase }) {
  const { setWorkbenchMode } = useAuth()
  const router = useRouter()
  const [usedTools, setUsedTools] = useState<Set<ToolId>>(new Set())
  const [showImpression, setShowImpression] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; response: string } | null>(null)

  useEffect(() => { setWorkbenchMode(true); return () => setWorkbenchMode(false) }, [setWorkbenchMode])

  function markToolUsed(id: ToolId) {
    setUsedTools((prev) => new Set(Array.from(prev).concat(id)))
  }

  const canSubmit = usedTools.size >= 2

  async function handleSubmit(diagnosis: string, management: string) {
    setIsSubmitting(true)
    setShowImpression(false)
    try {
      const res = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswer: `Diagnosis: ${diagnosis}. Management: ${management}`,
          question: "What is the diagnosis and immediate management?",
          context: `${workupCase.age}y ${workupCase.gender}, ${workupCase.chiefComplaint}. Expected: ${workupCase.expectedDiagnosis}`,
          specialty: "Emergency Cardiology",
        }),
      })
      const data = res.ok ? await res.json() : {}
      setFeedback({ correct: !!data.isCorrect, response: data.feedback || "Review the teaching points below." })
    } catch {
      setFeedback({ correct: false, response: "Could not reach the AI tutor. Review teaching points below." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: "white" }}>

      {/* ── Header ── */}
      <div className="flex h-[56px] shrink-0 items-center justify-between px-6" style={{ backgroundColor: "#d9d9d9" }}>
        <GhostBtn onClick={() => router.back()} className="h-8 px-3 text-xs">← Exit</GhostBtn>
        <p className="text-sm font-bold" style={{ color: "#1A1612", fontFamily: SANS }}>
          {workupCase.age}{workupCase.gender === "male" ? "M" : "F"} · {workupCase.chiefComplaint}
        </p>
        <div className="flex items-center gap-3">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOOLS.map((t) => (
              <div key={t.id} style={{
                width: 7, height: 7, borderRadius: "50%",
                backgroundColor: usedTools.has(t.id as ToolId) ? "#16a34a" : "rgba(0,0,0,0.15)",
                transition: "background-color 0.3s",
              }} />
            ))}
          </div>
          <span className="text-xs" style={{ color: "#6B6A65" }}>{usedTools.size}/{TOOLS.length}</span>
          {canSubmit && (
            <PrimaryBtn onClick={() => setShowImpression(true)} className="h-8 px-4 text-xs">
              Form impression <ArrowRight className="h-3.5 w-3.5" />
            </PrimaryBtn>
          )}
        </div>
      </div>

      {/* ── The Physical Desk Layout ── */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        style={{
          // Premium dark medical workspace surface with a subtle central spotlight
          background: "radial-gradient(circle at 50% 10%, #2f333a 0%, #17191c 80%, #0d0f12 100%)",
          boxShadow: "inset 0 10px 40px rgba(0,0,0,0.8)"
        }}
      >
        <div className="flex h-full min-w-max items-center justify-start gap-8 px-12 pb-4 pt-12">

          {/* Main Monitor (ECG & Vitals) */}
          <div className="flex flex-col h-full w-[900px] shrink-0 gap-[4px] perspective-[1000px] transition-transform duration-500 z-10" style={{ transform: "rotateY(-2deg) translateZ(10px)", filter: "drop-shadow(20px 30px 40px rgba(0,0,0,0.7))" }}>
            <div className="flex-1 flex flex-col">
              <ECGMonitorPanel
                unlocked={usedTools.has("ecg")}
                params={workupCase.ecgParams}
                onUnlock={() => markToolUsed("ecg")}
              />
            </div>
            <div className="h-[240px] flex gap-[4px]">
              <div className="w-[360px]">
                <VitalSignsPanel
                  unlocked={usedTools.has("vitals")}
                  vitals={workupCase.vitals}
                  onUnlock={() => markToolUsed("vitals")}
                />
              </div>
              <div className="flex-1">
                <BloodWorkPanel
                  unlocked={usedTools.has("bloods")}
                  results={workupCase.labResults}
                  onUnlock={() => markToolUsed("bloods")}
                />
              </div>
            </div>
          </div>

          {/* Paperwork / Desk Items */}
          <div className="flex items-center gap-6 h-[90%] pb-6 z-20">
            {/* Patient History Folder - slightly rotated on desk */}
            <div className="w-[380px] h-full transition-transform duration-500 hover:translate-y-[-10px]" style={{ transform: "rotate(2deg)" }}>
              <PatientHistoryPanel
                unlocked={usedTools.has("history")}
                workupCase={workupCase}
                onUnlock={() => markToolUsed("history")}
              />
            </div>

            {/* Auscultation Notes - resting over/near history */}
            <div className="w-[320px] h-[340px] self-end mb-12 transition-transform duration-500 hover:translate-y-[-10px] hover:scale-[1.02] z-30" style={{ transform: "rotate(-3deg) translateX(-40px)", filter: "drop-shadow(-10px 15px 20px rgba(0,0,0,0.4))" }}>
              <AuscultationPanel
                unlocked={usedTools.has("auscultate")}
                auscultation={workupCase.auscultation}
                onUnlock={() => markToolUsed("auscultate")}
              />
            </div>

            {/* Standard Clipboard for Checklist */}
            <div className="w-[320px] h-full self-start mt-6 transition-transform duration-500 hover:translate-y-[-10px]" style={{ transform: "rotate(-1deg)" }}>
              <ChecklistPanel usedTools={usedTools} onUseTool={markToolUsed} />
            </div>
          </div>
        </div>
      </div>

      {showImpression && (
        <ImpressionModal onSubmit={handleSubmit} onClose={() => setShowImpression(false)} isSubmitting={isSubmitting} />
      )}
      {feedback && (
        <FeedbackPanel feedback={feedback} expectedDiagnosis={workupCase.expectedDiagnosis}
          teachingPoints={workupCase.teachingPoints} onDone={() => router.back()} />
      )}
    </div>
  )
}
