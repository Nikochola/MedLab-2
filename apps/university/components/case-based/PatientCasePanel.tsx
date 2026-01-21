"use client"

import { PatientCase } from "./CaseGenerator"
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Stethoscope,
  User,
} from "lucide-react"
interface PatientCasePanelProps {
  case: PatientCase
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function PatientCasePanel({
  case: patientCase,
  collapsed = false,
  onToggleCollapse,
}: PatientCasePanelProps) {
  const genderLabel = patientCase.gender
    ? patientCase.gender.charAt(0).toUpperCase() + patientCase.gender.slice(1)
    : "—"

  if (collapsed) {
    return (
      <div className="h-full p-4">
        <div className="flex h-full flex-col items-center justify-start gap-4">
          <button
            type="button"
            className="rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
            onClick={() => onToggleCollapse?.()}
            aria-label="Expand case panel"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            style={{ writingMode: "vertical-rl" }}
          >
            Case
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold mb-2">Patient Case</h2>
            <p className="text-sm font-medium text-muted-foreground">Review the clinical information</p>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="rounded-2xl border border-border/70 bg-white/80 p-2 text-muted-foreground transition hover:text-foreground"
              onClick={onToggleCollapse}
              aria-label="Collapse case panel"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="portal-surface w-full p-4">
          <div>
            <div className="text-base font-semibold">Case Summary</div>
            <div className="text-sm font-medium text-muted-foreground">
              {patientCase.age}y · {genderLabel} · {patientCase.chiefComplaint}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white/70 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Clinical Snapshot
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Age</div>
                  <div className="font-semibold">{patientCase.age} years old</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Gender</div>
                  <div className="font-semibold">{genderLabel}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Blood Pressure</div>
                  <div className="font-semibold">{patientCase.vitalSigns.bloodPressure} mmHg</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Respiratory Rate</div>
                  <div className="font-semibold">{patientCase.vitalSigns.respiratoryRate} /min</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Temperature</div>
                  <div className="font-semibold">{patientCase.vitalSigns.temperature}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Oxygen Saturation</div>
                  <div className="font-semibold">{patientCase.vitalSigns.oxygenSaturation}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <details className="rounded-2xl border border-border/60 bg-white/70 p-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Demographics
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <span>Age</span>
                    <span className="font-medium text-foreground">{patientCase.age} years old</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Gender</span>
                    <span className="font-medium text-foreground">{genderLabel}</span>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-border/60 bg-white/70 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Vital Signs
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <div className="text-xs">Blood Pressure</div>
                    <div className="font-medium text-foreground">{patientCase.vitalSigns.bloodPressure} mmHg</div>
                  </div>
                  <div>
                    <div className="text-xs">Respiratory Rate</div>
                    <div className="font-medium text-foreground">{patientCase.vitalSigns.respiratoryRate} /min</div>
                  </div>
                  <div>
                    <div className="text-xs">Temperature</div>
                    <div className="font-medium text-foreground">{patientCase.vitalSigns.temperature}</div>
                  </div>
                  <div>
                    <div className="text-xs">Oxygen Saturation</div>
                    <div className="font-medium text-foreground">{patientCase.vitalSigns.oxygenSaturation}</div>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-border/60 bg-white/70 p-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Chief Complaint
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {patientCase.chiefComplaint}
                </p>
              </details>

              <details className="rounded-2xl border border-border/60 bg-white/70 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    History of Present Illness
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {patientCase.historyOfPresentIllness}
                </p>
              </details>

              <details className="rounded-2xl border border-border/60 bg-white/70 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Past Medical History
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {patientCase.pastMedicalHistory}
                </p>
              </details>

              <details className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Clinical Context
                  </span>
                  <ChevronDown className="h-4 w-4 text-primary" />
                </summary>
                <p className="mt-3 text-sm text-foreground leading-relaxed">
                  {patientCase.clinicalContext}
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
