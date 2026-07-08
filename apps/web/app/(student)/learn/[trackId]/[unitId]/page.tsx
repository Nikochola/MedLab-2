"use client"

import { useParams } from "next/navigation"
import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { ClinicalWorkupMode } from "@/components/clinical/ClinicalWorkupMode"
import { RadiologyComingSoon } from "@/components/RadiologyComingSoon"
import { getTrackById } from "@/lib/tracks/trackData"
import { getUnitPreset } from "@/lib/tracks/trackCaseData"

export default function UnitPage() {
  const params = useParams()
  const trackId = params?.trackId as string
  const unitId = params?.unitId as string

  const track = getTrackById(trackId)
  const unit = track?.units.find((u) => u.id === unitId)
  const preset = getUnitPreset(unitId)

  if (trackId === "chest-xray") {
    return <RadiologyComingSoon />
  }

  // No preset — fall back to standard random simulations
  if (!preset) {
    if (trackId === "ecg-fundamentals") {
      return <ECGWorkbench initialMode={unit?.type === "case" ? "case-based" : "simulation"} />
    }
    return <RadiologyComingSoon />
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

  return <RadiologyComingSoon />
}
