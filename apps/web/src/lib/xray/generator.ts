import { promises as fs } from "fs"
import path from "path"
import sharp from "sharp"
import assetManifest from "@/lib/xray/assets-manifest.json"
import maskZones from "../../../public/xray/masks/zones.json"
import type {
  XRayAssetManifestItem,
  XRayGenerateRequest,
  XRayGenerationResult,
  XRayMarker,
  XRayPathologyType,
  XRaySeverity,
  XRayView,
} from "@/lib/xray/types"
import { XRAY_WARNING_TEXT } from "@/lib/xray/types"
import { getBaseImageBuffer, getJsonObject, getXRayStorageBackend } from "@/lib/xray/storage"

const syntheticManifest = assetManifest as XRayAssetManifestItem[]
const zones = maskZones as {
  anchors: Record<string, { x: number; y: number }>
}

const NIH_MANIFEST_LOCAL_PATH = path.join(process.cwd(), "lib", "xray", "assets-manifest.nih.json")
const NIH_MANIFEST_R2_KEY = "xray/manifests/assets-manifest.nih.json"

let manifestCache: { loadedAt: number; items: XRayAssetManifestItem[] } | null = null
const MANIFEST_CACHE_MS = 60_000

class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next() {
    this.state += 0x6d2b79f5
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number, max: number) {
    return min + this.next() * (max - min)
  }

  pick<T>(values: T[]): T {
    return values[this.int(0, values.length - 1)]
  }
}

function severityFactor(severity: XRaySeverity) {
  if (severity === "mild") return 0.45
  if (severity === "moderate") return 0.72
  return 1
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function withSourceDefaults(item: XRayAssetManifestItem): XRayAssetManifestItem {
  const sourceType = item.sourceType ?? "synthetic"
  const sourceDataset = item.sourceDataset ?? (sourceType === "synthetic" ? "medlab.synthetic.v1" : "nih-chest-xrays/sample")
  const file = item.file
  const storageKey = item.storageKey ?? (file ? `xray/base/${sourceType === "synthetic" ? "synthetic" : "nih"}/${file}` : undefined)

  return {
    ...item,
    sourceType,
    sourceDataset,
    storageKey,
  }
}

async function loadNIHManifestFromLocalFile() {
  try {
    const raw = await fs.readFile(NIH_MANIFEST_LOCAL_PATH, "utf8")
    const parsed = JSON.parse(raw) as XRayAssetManifestItem[]
    return parsed
  } catch {
    return []
  }
}

async function loadNIHManifestFromR2() {
  if (getXRayStorageBackend() !== "r2") return [] as XRayAssetManifestItem[]
  try {
    return (await getJsonObject<XRayAssetManifestItem[]>(NIH_MANIFEST_R2_KEY)) ?? []
  } catch {
    return []
  }
}

async function loadManifest() {
  const now = Date.now()
  if (manifestCache && now - manifestCache.loadedAt < MANIFEST_CACHE_MS) {
    return manifestCache.items
  }

  const nihFromR2 = await loadNIHManifestFromR2()
  const nihFromFile = nihFromR2.length > 0 ? [] : await loadNIHManifestFromLocalFile()

  const merged = [...syntheticManifest, ...nihFromR2, ...nihFromFile].map(withSourceDefaults)
  manifestCache = { loadedAt: now, items: merged }
  return merged
}

function pickBaseAsset(view: XRayView, random: SeededRandom, items: XRayAssetManifestItem[]) {
  const pool = items.filter((item) => item.view === view)
  if (pool.length === 0) {
    throw new Error(`No X-ray assets available for view ${view}`)
  }

  const nihPool = pool.filter((item) => item.sourceType === "nih_kaggle_sample")
  const selectedPool = nihPool.length > 0 ? nihPool : pool

  return random.pick(selectedPool)
}

function toPx(value: number, total: number) {
  return clamp(Math.round(value * total), 0, total - 1)
}

function buildPneumoniaOverlay(width: number, height: number, random: SeededRandom, severity: XRaySeverity) {
  const factor = severityFactor(severity)
  const side = random.pick(["left", "right"]) as "left" | "right"
  const anchor = side === "left" ? zones.anchors.lowerLungLeft : zones.anchors.lowerLungRight
  const radiusX = Math.round(width * random.float(0.11, 0.18) * factor)
  const radiusY = Math.round(height * random.float(0.09, 0.16) * factor)
  const cx = toPx(anchor.x + random.float(-0.04, 0.04), width)
  const cy = toPx(anchor.y + random.float(-0.06, 0.05), height)

  const opacity = clamp(0.2 + factor * 0.42, 0.22, 0.66)
  const bronchiCount = Math.max(2, Math.round(3 + factor * 4))

  let bronchi = ""
  for (let i = 0; i < bronchiCount; i += 1) {
    const offsetX = random.int(-Math.round(radiusX * 0.5), Math.round(radiusX * 0.5))
    const offsetY = random.int(-Math.round(radiusY * 0.45), Math.round(radiusY * 0.45))
    const length = random.int(Math.round(radiusY * 0.3), Math.round(radiusY * 0.75))
    bronchi += `<line x1="${cx + offsetX}" y1="${cy + offsetY}" x2="${cx + offsetX + random.int(-8, 8)}" y2="${cy + offsetY + length}" stroke="rgba(255,255,255,0.34)" stroke-width="${random.float(1.1, 2.4).toFixed(2)}" stroke-linecap="round"/>`
  }

  const overlay = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="${(4 + factor * 9).toFixed(2)}"/></filter>
  </defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${radiusX}" ry="${radiusY}" fill="rgba(244,244,244,${opacity.toFixed(3)})" filter="url(#blur)" />
  ${bronchi}
</svg>`

  const markers: XRayMarker[] = [
    { x: Math.round((cx / width) * 100), y: Math.round((cy / height) * 100), label: "Consolidation", severity },
    { x: Math.round(((cx + radiusX * 0.2) / width) * 100), y: Math.round(((cy + radiusY * 0.15) / height) * 100), label: "Air bronchograms", severity },
  ]

  return { overlay, markers, operation: `pathology:pneumonia:${side}` }
}

function buildEffusionOverlay(width: number, height: number, random: SeededRandom, severity: XRaySeverity) {
  const factor = severityFactor(severity)
  const side = random.pick(["left", "right"]) as "left" | "right"
  const anchor = side === "left" ? zones.anchors.costophrenicLeft : zones.anchors.costophrenicRight
  const cx = toPx(anchor.x + random.float(-0.03, 0.03), width)
  const cy = toPx(anchor.y + random.float(-0.02, 0.02), height)
  const arcWidth = Math.round(width * random.float(0.18, 0.24) * (0.85 + factor * 0.4))
  const meniscusHeight = Math.round(height * random.float(0.06, 0.1) * (0.8 + factor * 0.5))

  const x0 = clamp(cx - arcWidth, 0, width)
  const x1 = clamp(cx + arcWidth, 0, width)
  const yTop = clamp(cy - meniscusHeight, 0, height)
  const yBottom = clamp(cy + meniscusHeight * 2.6, 0, height)

  const overlay = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="effusionGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,${(0.16 + factor * 0.16).toFixed(3)})"/>
      <stop offset="100%" stop-color="rgba(255,255,255,${(0.36 + factor * 0.2).toFixed(3)})"/>
    </linearGradient>
    <filter id="soften"><feGaussianBlur stdDeviation="3.2"/></filter>
  </defs>
  <path d="M ${x0} ${yBottom} C ${x0} ${yTop}, ${x1} ${yTop}, ${x1} ${yBottom} Z" fill="url(#effusionGrad)" filter="url(#soften)"/>
</svg>`

  const markers: XRayMarker[] = [
    { x: Math.round((cx / width) * 100), y: Math.round((yTop / height) * 100), label: "Meniscus", severity },
    { x: Math.round((cx / width) * 100), y: Math.round((yBottom / height) * 100), label: "Pleural fluid", severity },
  ]

  return { overlay, markers, operation: `pathology:pleural_effusion:${side}` }
}

function buildPneumothoraxOverlay(width: number, height: number, random: SeededRandom, severity: XRaySeverity) {
  const factor = severityFactor(severity)
  const side = random.pick(["left", "right"]) as "left" | "right"
  const anchor = side === "left" ? zones.anchors.apicalLeft : zones.anchors.apicalRight

  const xStart = toPx(anchor.x + random.float(-0.03, 0.015), width)
  const yStart = toPx(anchor.y + random.float(-0.05, 0.02), height)
  const lineLength = Math.round(height * random.float(0.14, 0.26) * (0.8 + factor * 0.4))
  const yEnd = clamp(yStart + lineLength, 0, height - 1)

  const lucencyWidth = Math.round(width * random.float(0.11, 0.18) * (0.85 + factor * 0.5))
  const sideShift = side === "left" ? -lucencyWidth : lucencyWidth

  const overlay = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="fade"><feGaussianBlur stdDeviation="2.6"/></filter>
  </defs>
  <rect x="${Math.min(xStart, xStart + sideShift)}" y="${yStart}" width="${Math.abs(sideShift)}" height="${Math.max(1, yEnd - yStart)}" fill="rgba(0,0,0,${(0.08 + factor * 0.16).toFixed(3)})" filter="url(#fade)"/>
  <line x1="${xStart}" y1="${yStart}" x2="${xStart}" y2="${yEnd}" stroke="rgba(255,255,255,${(0.58 + factor * 0.2).toFixed(3)})" stroke-width="${(1.2 + factor * 1.1).toFixed(2)}" />
</svg>`

  const markers: XRayMarker[] = [
    { x: Math.round((xStart / width) * 100), y: Math.round((yStart / height) * 100), label: "Pleural line", severity },
    {
      x: Math.round(((xStart + sideShift * 0.45) / width) * 100),
      y: Math.round(((yStart + (yEnd - yStart) * 0.45) / height) * 100),
      label: "Absent peripheral markings",
      severity,
    },
  ]

  return { overlay, markers, operation: `pathology:pneumothorax:${side}` }
}

function buildCardiomegalyOverlay(width: number, height: number, random: SeededRandom, severity: XRaySeverity) {
  const factor = severityFactor(severity)
  const anchor = zones.anchors.cardiacSilhouette
  const cx = toPx(anchor.x + random.float(-0.01, 0.01), width)
  const cy = toPx(anchor.y + random.float(-0.01, 0.02), height)

  const rx = Math.round(width * random.float(0.19, 0.27) * (0.85 + factor * 0.36))
  const ry = Math.round(height * random.float(0.19, 0.24) * (0.85 + factor * 0.34))

  const overlay = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="4.2"/></filter>
  </defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(255,255,255,${(0.2 + factor * 0.18).toFixed(3)})" filter="url(#blur)"/>
</svg>`

  const markers: XRayMarker[] = [
    { x: Math.round((cx / width) * 100), y: Math.round((cy / height) * 100), label: "Enlarged silhouette", severity },
    {
      x: Math.round(((cx + rx * 0.25) / width) * 100),
      y: Math.round(((cy - ry * 0.55) / height) * 100),
      label: "Cardiothoracic ratio",
      severity,
    },
  ]

  return { overlay, markers, operation: "pathology:cardiomegaly:central" }
}

function buildPathologyOverlay(
  pathology: XRayPathologyType,
  width: number,
  height: number,
  random: SeededRandom,
  severity: XRaySeverity
) {
  if (pathology === "normal") {
    return { overlay: null as Buffer | null, markers: [] as XRayMarker[], operation: "pathology:normal" }
  }

  if (pathology === "pneumonia") {
    const { overlay, markers, operation } = buildPneumoniaOverlay(width, height, random, severity)
    return { overlay: Buffer.from(overlay), markers, operation }
  }

  if (pathology === "pleural_effusion") {
    const { overlay, markers, operation } = buildEffusionOverlay(width, height, random, severity)
    return { overlay: Buffer.from(overlay), markers, operation }
  }

  if (pathology === "pneumothorax") {
    const { overlay, markers, operation } = buildPneumothoraxOverlay(width, height, random, severity)
    return { overlay: Buffer.from(overlay), markers, operation }
  }

  const { overlay, markers, operation } = buildCardiomegalyOverlay(width, height, random, severity)
  return { overlay: Buffer.from(overlay), markers, operation }
}

function buildNoiseOverlay(width: number, height: number, random: SeededRandom, variance: number) {
  const pixels = width * height
  const raw = Buffer.alloc(pixels * 4)

  for (let i = 0; i < pixels; i += 1) {
    const noise = Math.round((random.next() - 0.5) * variance * 2)
    const alpha = clamp(Math.abs(noise) * 2 + 4, 0, 36)
    const value = noise >= 0 ? 255 : 0

    const offset = i * 4
    raw[offset] = value
    raw[offset + 1] = value
    raw[offset + 2] = value
    raw[offset + 3] = alpha
  }

  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

function percentileFromHistogram(hist: Uint32Array, total: number, percentile: number) {
  const target = total * percentile
  let cumulative = 0
  for (let i = 0; i < hist.length; i += 1) {
    cumulative += hist[i]
    if (cumulative >= target) return i
  }
  return hist.length - 1
}

async function histogramStats(inputBuffer: Buffer, width: number, height: number) {
  const raw = await sharp(inputBuffer).greyscale().raw().toBuffer()
  const hist = new Uint32Array(256)

  for (let i = 0; i < raw.length; i += 1) {
    hist[raw[i]] += 1
  }

  const total = width * height
  const p02 = percentileFromHistogram(hist, total, 0.02)
  const p10 = percentileFromHistogram(hist, total, 0.1)
  const p50 = percentileFromHistogram(hist, total, 0.5)
  const p90 = percentileFromHistogram(hist, total, 0.9)
  const p98 = percentileFromHistogram(hist, total, 0.98)

  return { p02, p10, p50, p90, p98 }
}

async function normalizeAndValidate(buffer: Buffer, width: number, height: number) {
  const stats = await histogramStats(buffer, width, height)

  const span = Math.max(1, stats.p98 - stats.p02)
  const gain = clamp(210 / span, 0.78, 1.46)
  const offset = clamp(12 - stats.p02 * 0.35, -24, 26)

  const calibrated = await sharp(buffer)
    .linear(gain, offset)
    .modulate({ brightness: 1.02 })
    .png()
    .toBuffer()

  const calibratedStats = await histogramStats(calibrated, width, height)

  const valid =
    calibratedStats.p10 >= 14 &&
    calibratedStats.p10 <= 78 &&
    calibratedStats.p90 >= 160 &&
    calibratedStats.p90 <= 245 &&
    calibratedStats.p98 >= 220 &&
    calibratedStats.p98 <= 252

  return { calibrated, valid, stats: calibratedStats }
}

function markersValid(markers: XRayMarker[]) {
  return markers.every((marker) => marker.x >= 0 && marker.x <= 100 && marker.y >= 0 && marker.y <= 100)
}

export async function generateXRayImage(input: Required<XRayGenerateRequest>): Promise<XRayGenerationResult> {
  let rejectedSamples = 0
  let lastResult: XRayGenerationResult | null = null
  const manifest = await loadManifest()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const seed = input.seed + attempt * 7919
    const random = new SeededRandom(seed)
    const baseAsset = pickBaseAsset(input.view, random, manifest)
    const baseImageBuffer = await getBaseImageBuffer(baseAsset)

    const operations: string[] = []

    const source = sharp(baseImageBuffer).greyscale()
    const metadata = await source.metadata()
    const width = metadata.width ?? 640
    const height = metadata.height ?? 800

    const shearX = random.float(-0.015, 0.015)
    const shearY = random.float(-0.015, 0.015)
    const rotateDeg = random.float(-1.3, 1.3)

    operations.push(`base:${baseAsset.id}`)
    operations.push(`affine:${shearX.toFixed(3)},${shearY.toFixed(3)}`)
    operations.push(`rotate:${rotateDeg.toFixed(2)}`)

    let pipeline = source
      .affine(
        [
          [1, shearX],
          [shearY, 1],
        ],
        {
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        }
      )
      .rotate(rotateDeg, { background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .resize(width, height, { fit: "cover" })

    const maybeClahe = pipeline as typeof pipeline & {
      clahe?: (options?: { width?: number; height?: number; maxSlope?: number }) => typeof pipeline
    }

    if (typeof maybeClahe.clahe === "function") {
      pipeline = maybeClahe.clahe({ width: 7, height: 7, maxSlope: 3 })
      operations.push("normalize:clahe")
    } else {
      pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0.8, m2: 2.2 })
      operations.push("normalize:sharpen")
    }

    const ribGain = random.float(0.97, 1.05)
    const tissueOffset = random.float(-6, 6)
    pipeline = pipeline.linear(ribGain, tissueOffset)
    operations.push(`tissue:gain:${ribGain.toFixed(3)}:offset:${tissueOffset.toFixed(2)}`)

    const pathologyOverlay = buildPathologyOverlay(input.pathology, width, height, random, input.severity)
    operations.push(pathologyOverlay.operation)

    let composed = pipeline

    if (pathologyOverlay.overlay) {
      composed = composed.composite([{ input: pathologyOverlay.overlay, blend: "screen" }])
    }

    if (input.view === "AP") {
      const apScale = random.float(1.015, 1.045)
      const scaledWidth = Math.max(width, Math.round(width * apScale))
      const scaledHeight = Math.max(height, Math.round(height * apScale))
      const left = Math.round((scaledWidth - width) / 2)
      const top = Math.round((scaledHeight - height) / 2)

      composed = composed
        .resize(scaledWidth, scaledHeight, { fit: "fill" })
        .extract({ left, top, width, height })
        .blur(0.42)
      operations.push(`acquisition:ap_scale:${apScale.toFixed(3)}`)
    } else {
      composed = composed.blur(0.3)
      operations.push("acquisition:pa")
    }

    const noiseVariance = input.view === "AP" ? 12 : 9
    const noise = await buildNoiseOverlay(width, height, random, noiseVariance)
    composed = composed.composite([{ input: noise, blend: "overlay" }])
    operations.push(`noise:${noiseVariance}`)

    const png = await composed.png().toBuffer()
    const { calibrated, valid } = await normalizeAndValidate(png, width, height)
    operations.push("calibration:histogram_clamp")

    const markers = pathologyOverlay.markers
    const anatomyValid = markersValid(markers)

    const provenance = {
      seed,
      baseImageId: baseAsset.id,
      view: input.view,
      pathology: input.pathology,
      severity: input.severity,
      sourceType: baseAsset.sourceType ?? "synthetic",
      sourceDataset: baseAsset.sourceDataset ?? "medlab.synthetic.v1",
      sourceLicense: baseAsset.sourceLicense,
      operations,
      markers,
      diagnosticUse: false as const,
      warningText: XRAY_WARNING_TEXT,
    }

    lastResult = {
      pngBuffer: calibrated,
      width,
      height,
      provenance,
      rejectedSamples,
    }

    if (valid && anatomyValid) {
      return {
        ...lastResult,
        rejectedSamples,
      }
    }

    rejectedSamples += 1
  }

  if (!lastResult) {
    throw new Error("Failed to generate X-ray image")
  }

  return {
    ...lastResult,
    rejectedSamples,
  }
}
