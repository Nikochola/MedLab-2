// components/ecg/ECGWaveformGenerator.ts

export interface ECGWaveformParams {
  heartRate?: number // bpm
  rhythm?: "normal" | "afib" | "bradycardia" | "tachycardia"
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
function ecgBeat(t: number): number {
  let v = 0
  // P wave
  v += 0.18 * Math.exp(-Math.pow((t - 0.12) / 0.035, 2))
  // Q wave
  v += -0.3 * Math.exp(-Math.pow((t - 0.2) / 0.01, 2))
  // R wave
  v += 1.25 * Math.exp(-Math.pow((t - 0.22) / 0.012, 2))
  // S wave
  v += -0.4 * Math.exp(-Math.pow((t - 0.24) / 0.014, 2))
  // T wave
  v += 0.4 * Math.exp(-Math.pow((t - 0.38) / 0.055, 2))
  return v
}

/* ---------- 2. Base dipole signal (shared across all 12 leads) ---------- */

function generateBaseSignal(
  heartRate: number,
  duration: number,
  sampleRate: number
): Float32Array {
  const sampleCount = Math.floor(duration * sampleRate)
  const base = new Float32Array(sampleCount)

  const beatsPerSecond = heartRate / 60
  const rr = 1 / beatsPerSecond // seconds between R peaks

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate // seconds
    const phase = (t % rr) / rr // 0–1 within beat

    let v = ecgBeat(phase)

    // Mild baseline wander (respiration-like)
    v += 0.03 * Math.sin(2 * Math.PI * 0.3 * t)

    // Beat-to-beat jitter, deterministic (no desync)
    const beatIndex = Math.floor(t / rr)
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

  const key = JSON.stringify({ heartRate, duration, sampleRate })

  if (!cachedLeads || key !== cachedKey) {
    const base = generateBaseSignal(heartRate, duration, sampleRate)
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
    { heartRate: 75, rhythm: "normal", abnormalities: {} }, // Normal ECG
    { heartRate: 55, rhythm: "bradycardia", abnormalities: { qWaves: false } }, // AV block I (simulated brady)
    { heartRate: 45, rhythm: "bradycardia", abnormalities: { stDepression: true } }, // AV block II (simulated brady + slight ST dep)
    { heartRate: 35, rhythm: "bradycardia", abnormalities: { qWaves: true } }, // AV block III (simulated brady + q waves)
    { heartRate: 160, rhythm: "tachycardia", abnormalities: {} }, // SVT
    { heartRate: 140, rhythm: "tachycardia", abnormalities: { rightAxis: true } }, // VT (fast with RAD)
    { heartRate: 95, rhythm: "normal", abnormalities: { stElevation: true } }, // STEMI
    { heartRate: 90, rhythm: "normal", abnormalities: { qWaves: true, tWaveInversion: true } }, // MI (prior)
    { heartRate: 82, rhythm: "normal", abnormalities: { leftAxis: true, stDepression: true } }, // LVH pattern surrogate
    { heartRate: 88, rhythm: "normal", abnormalities: { rightAxis: true, stDepression: true } }, // RVH/RAE surrogate
    { heartRate: 170, rhythm: "tachycardia", abnormalities: { stDepression: true } }, // VF surrogate (fast irregular)
    { heartRate: 120, rhythm: "afib", abnormalities: { stDepression: true } }, // Afib
    { heartRate: 130, rhythm: "tachycardia", abnormalities: { stElevation: true, qWaves: true } }, // WPW surrogate
  ]

  const choice = variants[Math.floor(Math.random() * variants.length)]
  return {
    ...choice,
    duration: 10,
    sampleRate: 500,
  }
}
