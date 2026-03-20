export type XRayView = "PA" | "AP"

export type XRayPathologyType =
  | "normal"
  | "pneumonia"
  | "pleural_effusion"
  | "pneumothorax"
  | "cardiomegaly"

export type XRaySeverity = "mild" | "moderate" | "severe"
export type XRaySourceType = "synthetic" | "nih_kaggle_sample" | "real_clinical"

export interface XRayGenerateRequest {
  view: XRayView
  pathology: XRayPathologyType
  severity: XRaySeverity
  seed?: number
  count?: number
  source?: "synthetic" | "real"
  modality?: "XRAY" | "CT"
}

export interface XRayGeneratedImage {
  url: string
  width: number
  height: number
}

export interface XRayMarker {
  x: number
  y: number
  label: string
  severity: XRaySeverity
}

export interface XRayProvenance {
  seed: number
  baseImageId: string
  view: XRayView
  pathology: XRayPathologyType
  severity: XRaySeverity
  sourceType: XRaySourceType
  sourceDataset: string
  sourceLicense: string
  operations: string[]
  markers: XRayMarker[]
  diagnosticUse: false
  warningText: string
}

export interface XRayGenerateResponse {
  requestId: string
  images: XRayGeneratedImage[]
  provenance: XRayProvenance[]
  cacheHit: boolean
  generatedAt: string
  metrics: {
    generationMs: number
    rejectedSamples: number
  }
  diagnosticUse: false
  warningText: string
}

export interface XRayAssetManifestItem {
  id: string
  file?: string
  view: XRayView
  sex: "female" | "male"
  ageBand: "18-30" | "31-45" | "46-60" | "61+"
  quality: "portable" | "standard"
  sourceLicense: string
  sourceType?: XRaySourceType
  sourceDataset?: string
  storageKey?: string
  findingLabel?: string
  histogramProfile: {
    p10: number
    p50: number
    p90: number
  }
}

export interface XRayGenerationResult {
  pngBuffer: Buffer
  width: number
  height: number
  provenance: XRayProvenance
  rejectedSamples: number
}

export const XRAY_WARNING_TEXT =
  "Education-only output. Not for diagnosis, treatment, or clinical decision-making."
