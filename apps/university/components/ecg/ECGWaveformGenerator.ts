// components/ecg/ECGWaveformGenerator.ts

export interface ECGWaveformParams {
  heartRate?: number // bpm
  rhythm?: "sinus-regular" | "sinus-irregular" | "non-sinus-regular" | "non-sinus-irregular"
  prIntervalMs?: number
  qrsDurationMs?: number
  duration?: number // seconds
  sampleRate?: number // samples per second
  abnormalities?: {
    stElevation?: boolean
    stDepression?: boolean
    qWaves?: boolean
    tWaveInversion?: boolean
    leftAxis?: boolean
    rightAxis?: boolean
  }
}

export interface WaveformPoint {
  x: number // time in seconds
  y: number // “mV-like” amplitude (unitless, scaled later)
}

/* ---------- 1. Beat shape (P–QRS–T) ---------- */

// Single synthetic heartbeat: P–QRS–T using Gaussian pulses.
// t is phase in [0, 1).
type BeatShape = {
  pCenter: number
  pAmp: number
  qrsStart: number
  qrsDuration: number
  tCenter: number
  tAmp: number
  stOffset: number
}

function ecgBeat(t: number, shape: BeatShape): number {
  let v = 0
  const qrsDuration = Math.max(0.02, Math.min(shape.qrsDuration, 0.18))
  const qCenter = shape.qrsStart + qrsDuration * 0.1
  const rCenter = shape.qrsStart + qrsDuration * 0.45
  const sCenter = shape.qrsStart + qrsDuration * 0.8

  // P wave
  if (shape.pAmp > 0) {
    v += shape.pAmp * Math.exp(-Math.pow((t - shape.pCenter) / 0.035, 2))
  }
  // Q wave
  v += -0.3 * Math.exp(-Math.pow((t - qCenter) / 0.01, 2))
  // R wave
  v += 1.25 * Math.exp(-Math.pow((t - rCenter) / 0.012, 2))
  // S wave
  v += -0.4 * Math.exp(-Math.pow((t - sCenter) / 0.014, 2))

  // ST segment offset (simple approximation)
  const stStart = shape.qrsStart + qrsDuration * 0.45
  const stEnd = Math.max(stStart + 0.06, shape.tCenter - 0.03)
  if (shape.stOffset !== 0 && t >= stStart && t <= stEnd) {
    v += shape.stOffset
  }

  // T wave
  v += shape.tAmp * Math.exp(-Math.pow((t - shape.tCenter) / 0.055, 2))
  return v
}

/* ---------- 2. Base dipole signal (shared across all 12 leads) ---------- */

function generateBaseSignal(
  heartRate: number,
  duration: number,
  sampleRate: number,
  options: {
    rhythm?: ECGWaveformParams["rhythm"]
    prIntervalMs?: number
    qrsDurationMs?: number
    stElevation?: boolean
    stDepression?: boolean
    tWaveInversion?: boolean
  }
): Float32Array {
  const sampleCount = Math.floor(duration * sampleRate)
  const base = new Float32Array(sampleCount)

  const beatsPerSecond = heartRate / 60
  const baseRR = 1 / beatsPerSecond // seconds between R peaks
  const irregular = options.rhythm?.endsWith("irregular") ?? false
  const sinus = options.rhythm?.startsWith("sinus") ?? true
  const pAmp = sinus ? 0.18 : 0
  const stOffset = options.stElevation ? 0.18 : options.stDepression ? -0.18 : 0
  const tAmp = options.tWaveInversion ? -0.35 : 0.4

  const nextRR = (index: number) => {
    if (!irregular) return baseRR
    const jitterSeed = (index * 9301 + 49297) % 233280
    const jitter = 1 + ((jitterSeed / 233280) - 0.5) * 0.2 // ±20%
    return baseRR * jitter
  }

  let beatIndex = 0
  let beatStart = 0
  let rr = nextRR(beatIndex)

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate // seconds
    while (t - beatStart >= rr) {
      beatStart += rr
      beatIndex += 1
      rr = nextRR(beatIndex)
    }

    const phase = (t - beatStart) / rr // 0–1 within beat
    const rrMs = rr * 1000
    const prMs = options.prIntervalMs ?? 160
    const qrsMs = options.qrsDurationMs ?? 90
    const prFrac = Math.min(0.25, prMs / rrMs)
    const qrsFrac = Math.min(0.2, (qrsMs / 1000) / rr)
    const qrsStart = 0.3
    const tCenter = Math.min(0.88, qrsStart + qrsFrac + 0.18)
    const pCenter = Math.max(0.08, qrsStart - prFrac * 0.5)

    let v = ecgBeat(phase, {
      pCenter,
      pAmp,
      qrsStart,
      qrsDuration: qrsFrac,
      tCenter,
      tAmp,
      stOffset,
    })

    // Mild baseline wander (respiration-like)
    v += 0.03 * Math.sin(2 * Math.PI * 0.3 * t)

    // Beat-to-beat jitter, deterministic (no desync)
    const jitterSeed = (beatIndex * 9301 + 49297) % 233280
    const jitter = 1 + ((jitterSeed / 233280) - 0.5) * 0.08 // ±8%
    v *= jitter

    base[i] = v
  }

  return base
}

/* ---------- 3. Project base signal into 12 leads ---------- */

type LeadName =
  | "I"
  | "II"
  | "III"
  | "aVR"
  | "aVL"
  | "aVF"
  | "V1"
  | "V2"
  | "V3"
  | "V4"
  | "V5"
  | "V6"

type LeadMap = Record<LeadName, Float32Array>

function projectTo12Leads(base: Float32Array): LeadMap {
  const n = base.length

  const RA = new Float32Array(n)
  const LA = new Float32Array(n)
  const LL = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const d = base[i]
    // Simulated heart-vector projections at RA/LA/LL
    RA[i] = -0.4 * d
    LA[i] = 0.1 * d
    LL[i] = 0.4 * d
  }

  const I = new Float32Array(n)
  const II = new Float32Array(n)
  const III = new Float32Array(n)
  const aVR = new Float32Array(n)
  const aVL = new Float32Array(n)
  const aVF = new Float32Array(n)

  const V1 = new Float32Array(n)
  const V2 = new Float32Array(n)
  const V3 = new Float32Array(n)
  const V4 = new Float32Array(n)
  const V5 = new Float32Array(n)
  const V6 = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const ra = RA[i]
    const la = LA[i]
    const ll = LL[i]

    // Limb leads (Einthoven)
    I[i] = la - ra
    II[i] = ll - ra
    III[i] = ll - la

    // Augmented limb leads (Goldberger)
    const avg = (ra + la + ll) / 3
    aVR[i] = ra - avg
    aVL[i] = la - avg
    aVF[i] = ll - avg

    // Chest leads: realistic R-wave progression, **no extra baseline subtraction**
    const d = base[i]
    V1[i] = -0.5 * d
    V2[i] = -0.2 * d
    V3[i] = 0.2 * d
    V4[i] = 0.6 * d
    V5[i] = 0.9 * d
    V6[i] = 0.8 * d
  }

  return { I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6 }
}

/* ---------- 4. Cache so all leads share the same heartbeat ---------- */

let cachedKey: string | null = null
let cachedLeads: LeadMap | null = null
let cachedSampleRate = 500
let cachedDuration = 10

function getLeadsForParams(params: ECGWaveformParams): {
  leads: LeadMap
  sampleRate: number
  duration: number
} {
  const heartRate = params.heartRate ?? 75
  const duration = params.duration ?? 10
  const sampleRate = params.sampleRate ?? 500
  const key = JSON.stringify({
    heartRate,
    duration,
    sampleRate,
    rhythm: params.rhythm ?? "sinus-regular",
    prIntervalMs: params.prIntervalMs ?? 160,
    qrsDurationMs: params.qrsDurationMs ?? 90,
    stElevation: params.abnormalities?.stElevation ?? false,
    stDepression: params.abnormalities?.stDepression ?? false,
    tWaveInversion: params.abnormalities?.tWaveInversion ?? false,
  })

  if (!cachedLeads || key !== cachedKey) {
    const base = generateBaseSignal(heartRate, duration, sampleRate, {
      rhythm: params.rhythm ?? "sinus-regular",
      prIntervalMs: params.prIntervalMs,
      qrsDurationMs: params.qrsDurationMs,
      stElevation: params.abnormalities?.stElevation,
      stDepression: params.abnormalities?.stDepression,
      tWaveInversion: params.abnormalities?.tWaveInversion,
    })
    cachedLeads = projectTo12Leads(base)
    cachedKey = key
    cachedSampleRate = sampleRate
    cachedDuration = duration
  }

  return {
    leads: cachedLeads!,
    sampleRate: cachedSampleRate,
    duration: cachedDuration,
  }
}

/* ---------- 5. Public API: generate waveform for a single lead ---------- */

export function generateECGWaveform(
  lead: string,
  params: ECGWaveformParams = {}
): WaveformPoint[] {
  const validLead = ([
    "I",
    "II",
    "III",
    "aVR",
    "aVL",
    "aVF",
    "V1",
    "V2",
    "V3",
    "V4",
    "V5",
    "V6",
  ] as LeadName[]).includes(lead as LeadName)
    ? (lead as LeadName)
    : "II"

  const { leads, sampleRate } = getLeadsForParams(params)
  const samples = leads[validLead]
  const n = samples.length

  const points: WaveformPoint[] = new Array(n)

  for (let i = 0; i < n; i++) {
    const time = i / sampleRate
    let v = samples[i]

    // Very small static noise (kept tiny to stay smooth)
    v += (Math.random() - 0.5) * 0.01

    points[i] = { x: time, y: v }
  }

  return points
}

/* ---------- 6. Random params (mostly normal sinus) ---------- */

export function generateRandomECGParams(): ECGWaveformParams {
  const variants: ECGWaveformParams[] = [
    { heartRate: 72, rhythm: "sinus-regular", prIntervalMs: 160, qrsDurationMs: 90, abnormalities: {} },
    { heartRate: 58, rhythm: "sinus-regular", prIntervalMs: 180, qrsDurationMs: 90, abnormalities: { qWaves: false } },
    { heartRate: 80, rhythm: "sinus-irregular", prIntervalMs: 170, qrsDurationMs: 90, abnormalities: {} },
    { heartRate: 95, rhythm: "sinus-regular", prIntervalMs: 160, qrsDurationMs: 90, abnormalities: { stElevation: true } },
    { heartRate: 88, rhythm: "sinus-regular", prIntervalMs: 160, qrsDurationMs: 90, abnormalities: { stDepression: true } },
    { heartRate: 76, rhythm: "sinus-irregular", prIntervalMs: 170, qrsDurationMs: 90, abnormalities: { tWaveInversion: true } },
    { heartRate: 120, rhythm: "non-sinus-regular", prIntervalMs: 0, qrsDurationMs: 110, abnormalities: { rightAxis: true } },
    { heartRate: 140, rhythm: "non-sinus-regular", prIntervalMs: 0, qrsDurationMs: 120, abnormalities: { stDepression: true } },
    { heartRate: 130, rhythm: "non-sinus-irregular", prIntervalMs: 0, qrsDurationMs: 100, abnormalities: { stDepression: true } },
    { heartRate: 110, rhythm: "non-sinus-irregular", prIntervalMs: 0, qrsDurationMs: 100, abnormalities: { stElevation: true, qWaves: true } },
  ]

  const choice = variants[Math.floor(Math.random() * variants.length)]
  return {
    ...choice,
    duration: 10,
    sampleRate: 500,
  }
}
