"use client"

import { useParams, useSearchParams } from "next/navigation"
import { ECGWorkbench } from "@/components/ecg/ECGWorkbench"
import { ClinicalWorkupMode } from "@/components/clinical/ClinicalWorkupMode"
import { XRayWorkbench } from "@/components/xray/XRayWorkbench"
import { RadiologyComingSoon } from "@/components/RadiologyComingSoon"
import { getTrackById } from "@/lib/tracks/trackData"
import { getUnitPreset } from "@/lib/tracks/trackCaseData"

export default function UnitPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const trackId = params?.trackId as string
  const unitId = params?.unitId as string
  const courseId = searchParams.get("courseId")

  const track = getTrackById(trackId)
  const unit = track?.units.find((u) => u.id === unitId)
  const preset = getUnitPreset(unitId)

  // No preset — fall back to standard random simulations
  if (!preset) {
    if (trackId === "ecg-fundamentals") {
      return <ECGWorkbench initialMode={unit?.type === "case" ? "case-based" : "simulation"} unitId={unitId} courseId={courseId} />
    }
    return <RadiologyComingSoon />
  }

  if (preset.type === "workup") {
    return <ClinicalWorkupMode workupCase={preset.workupCase} unitId={unitId} courseId={courseId} />
  }

  if (preset.type === "ecg-sim") {
    return <ECGWorkbench initialMode="simulation" presetParams={preset.params} unitId={unitId} courseId={courseId} />
  }

  if (preset.type === "ecg-case") {
    return <ECGWorkbench initialMode="case-based" presetCase={preset.patientCase} unitId={unitId} courseId={courseId} />
  }

  if (preset.type === "xray") {
    return <XRayWorkbench initialMode={unit?.type === "case" ? "case-based" : "simulation"} presetCase={preset.xrayCase} unitId={unitId} courseId={courseId} />
  }

  return <RadiologyComingSoon />
}
