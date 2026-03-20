"use client"

import { useParams } from "next/navigation"
import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { XRayWorkbench } from "@/components/xray/XRayWorkbench"
import { ClinicalWorkupMode } from "@/components/clinical/ClinicalWorkupMode"
import { getTrackById } from "@/lib/tracks/trackData"
import { getUnitPreset } from "@/lib/tracks/trackCaseData"

export default function UnitPage() {
  const params = useParams()
  const trackId = params?.trackId as string
  const unitId = params?.unitId as string

  const track = getTrackById(trackId)
  const unit = track?.units.find((u) => u.id === unitId)
  const preset = getUnitPreset(unitId)

  // No preset — fall back to standard random simulations
  if (!preset) {
    if (trackId === "ecg-fundamentals") {
      return <ECGWorkbench initialMode={unit?.type === "case" ? "case-based" : "simulation"} />
    }
    return <XRayWorkbench initialMode={unit?.type === "case" ? "case-based" : "simulation"} />
  }

  if (preset.type === "workup") {
    return <ClinicalWorkupMode workupCase={preset.workupCase} />
  }

  if (preset.type === "ecg-sim") {
    return <ECGWorkbench initialMode="simulation" presetParams={preset.params} />
  }

  if (preset.type === "ecg-case") {
    return <ECGWorkbench initialMode="case-based" presetCase={preset.patientCase} />
  }

  return (
    <XRayWorkbench
      initialMode={unit?.type === "case" ? "case-based" : "simulation"}
      presetCase={preset.xrayCase}
    />
  )
}
