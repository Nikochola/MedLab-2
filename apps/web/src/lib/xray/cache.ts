import crypto from "crypto"
import type { XRayGenerateRequest, XRayGenerateResponse } from "@/lib/xray/types"
import {
  deleteObjectByKey,
  ensureLocalStorageRoots,
  getGeneratedImage,
  getJsonObject,
  getXRayStorageBackend,
  listObjectsByPrefix,
  objectExists,
  putGeneratedImage,
  putJsonObject,
} from "@/lib/xray/storage"

const GENERATED_PREFIX = "xray/generated"
const GENERATED_META_PREFIX = "xray/generated-meta"
const XRAY_RATE_WINDOW_MS = 60_000
const XRAY_RATE_MAX_REQUESTS = 12
const XRAY_MISS_WINDOW_MS = 60_000
const XRAY_MISS_MAX_REQUESTS = 8
const XRAY_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const XRAY_URL_SIGNING_SECRET = process.env.XRAY_CACHE_SIGNING_SECRET || "medlab-xray-cache-signing-secret"

const rateWindow = new Map<string, number[]>()
const missWindow = new Map<string, number[]>()

interface CachedPayload {
  response: XRayGenerateResponse
  imageFiles: string[]
  createdAt: number
}

function stableStringify(input: unknown): string {
  if (Array.isArray(input)) {
    return `[${input.map((value) => stableStringify(value)).join(",")}]`
  }

  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries
      .map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`)
      .join(",")}}`
  }

  return JSON.stringify(input)
}

function imageObjectKey(cacheKey: string, imageIndex: number) {
  return `${GENERATED_PREFIX}/${cacheKey}_${imageIndex}.png`
}

function metaObjectKey(cacheKey: string) {
  return `${GENERATED_META_PREFIX}/${cacheKey}.json`
}

export function normalizeRequest(input: XRayGenerateRequest): Required<XRayGenerateRequest> {
  const normalizedCount = Math.max(1, Math.min(2, Math.trunc(input.count ?? 1)))
  return {
    view: input.view,
    pathology: input.pathology,
    severity: input.severity,
    seed: Number.isFinite(input.seed) ? Math.trunc(input.seed as number) : Math.trunc(Math.random() * 2_147_483_647),
    count: normalizedCount,
    source: input.source ?? "synthetic",
    modality: input.modality ?? "XRAY",
  }
}

export function createRequestId(normalized: Required<XRayGenerateRequest>) {
  return crypto.createHash("sha256").update(stableStringify(normalized)).digest("hex").slice(0, 20)
}

export function getXRayCacheRoot() {
  return getXRayStorageBackend() === "r2" ? GENERATED_META_PREFIX : "tmp/xray/objects"
}

export async function ensureXRayCacheDir() {
  await ensureLocalStorageRoots()
}

export function assertRateLimit(key: string) {
  if (process.env.NODE_ENV !== "production") {
    return { allowed: true as const, retryAfterSeconds: 0 }
  }

  const now = Date.now()
  const previous = rateWindow.get(key) ?? []
  const active = previous.filter((value) => now - value < XRAY_RATE_WINDOW_MS)

  if (active.length >= XRAY_RATE_MAX_REQUESTS) {
    const retryAfterMs = XRAY_RATE_WINDOW_MS - (now - active[0])
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
    return { allowed: false as const, retryAfterSeconds }
  }

  active.push(now)
  rateWindow.set(key, active)
  return { allowed: true as const, retryAfterSeconds: 0 }
}

export function assertCacheMissLimit(key: string) {
  if (process.env.NODE_ENV !== "production") {
    return { allowed: true as const, retryAfterSeconds: 0 }
  }

  const now = Date.now()
  const previous = missWindow.get(key) ?? []
  const active = previous.filter((value) => now - value < XRAY_MISS_WINDOW_MS)

  if (active.length >= XRAY_MISS_MAX_REQUESTS) {
    const retryAfterMs = XRAY_MISS_WINDOW_MS - (now - active[0])
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
    return { allowed: false as const, retryAfterSeconds }
  }

  active.push(now)
  missWindow.set(key, active)
  return { allowed: true as const, retryAfterSeconds: 0 }
}

export async function writeCachedImage(cacheKey: string, imageIndex: number, buffer: Buffer) {
  const objectKey = imageObjectKey(cacheKey, imageIndex)
  await putGeneratedImage(objectKey, buffer)
  return { fileName: objectKey, filePath: objectKey }
}

export async function writeCachedPayload(cacheKey: string, payload: CachedPayload) {
  await putJsonObject(metaObjectKey(cacheKey), payload)
}

export async function readCachedPayload(cacheKey: string): Promise<CachedPayload | null> {
  const payload = await getJsonObject<CachedPayload>(metaObjectKey(cacheKey))
  if (!payload?.createdAt) return null

  const tooOld = Date.now() - payload.createdAt > XRAY_CACHE_TTL_MS
  if (tooOld) {
    await purgeCacheEntry(cacheKey, payload.imageFiles)
    return null
  }

  const imageExists = await Promise.all(payload.imageFiles.map(async (objectKey) => objectExists(objectKey)))
  if (imageExists.some((value) => !value)) {
    await purgeCacheEntry(cacheKey, payload.imageFiles)
    return null
  }

  return payload
}

export async function purgeOldCacheEntries() {
  if (getXRayStorageBackend() === "r2") {
    return
  }

  const metaKeys = await listObjectsByPrefix(GENERATED_META_PREFIX, 1_000)
  for (const key of metaKeys) {
    const payload = await getJsonObject<CachedPayload>(key)
    if (!payload?.createdAt) {
      await deleteObjectByKey(key)
      continue
    }
    if (Date.now() - payload.createdAt > XRAY_CACHE_TTL_MS) {
      await purgeCacheEntry(cacheKeyFromMetaKey(key), payload.imageFiles)
    }
  }
}

function cacheKeyFromMetaKey(key: string) {
  return key.replace(`${GENERATED_META_PREFIX}/`, "").replace(/\.json$/, "")
}

async function purgeCacheEntry(cacheKey: string, imageFiles: string[]) {
  await Promise.all([metaObjectKey(cacheKey), ...imageFiles].map(async (key) => deleteObjectByKey(key)))
}

export function getCacheImagePath(cacheKey: string, index: number) {
  return imageObjectKey(cacheKey, index)
}

export async function readCacheImage(cacheKey: string, index: number) {
  return getGeneratedImage(imageObjectKey(cacheKey, index))
}

export function signCacheImage(cacheKey: string, imageIndex: number) {
  return crypto
    .createHmac("sha256", XRAY_URL_SIGNING_SECRET)
    .update(`${cacheKey}:${imageIndex}`)
    .digest("hex")
    .slice(0, 20)
}

export function getSignedCacheImageUrl(cacheKey: string, imageIndex: number) {
  const signature = signCacheImage(cacheKey, imageIndex)
  return `/api/xray/cache/${cacheKey}/${imageIndex}?s=${signature}`
}

export async function listRecentCachedPayloads(limit = 200) {
  const keys = await listObjectsByPrefix(GENERATED_META_PREFIX, limit)
  const payloads: Array<{ key: string; payload: CachedPayload }> = []

  for (const key of keys) {
    const payload = await getJsonObject<CachedPayload>(key)
    if (payload) payloads.push({ key, payload })
  }

  return payloads.sort((a, b) => b.payload.createdAt - a.payload.createdAt)
}
