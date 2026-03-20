import { promises as fs } from "fs"
import path from "path"
import { Readable } from "stream"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import type { XRayAssetManifestItem } from "@/lib/xray/types"

type XRayStorageBackend = "local" | "r2"

const LOCAL_OBJECT_ROOT = path.join(process.cwd(), "tmp", "xray", "objects")
const LOCAL_GENERATED_ROOT = path.join(LOCAL_OBJECT_ROOT, "xray", "generated")
const LOCAL_META_ROOT = path.join(LOCAL_OBJECT_ROOT, "xray", "generated-meta")

let cachedClient: S3Client | null = null
let warnedR2Fallback = false

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorageUnavailableError"
  }
}

export function getXRayStorageBackend(): XRayStorageBackend {
  if (process.env.XRAY_STORAGE_BACKEND !== "r2") return "local"

  const hasCreds =
    Boolean(process.env.R2_ACCOUNT_ID) &&
    Boolean(process.env.R2_BUCKET_NAME) &&
    Boolean(process.env.R2_ACCESS_KEY_ID) &&
    Boolean(process.env.R2_SECRET_ACCESS_KEY)

  if (hasCreds) return "r2"

  if (process.env.NODE_ENV !== "production") {
    if (!warnedR2Fallback) {
      console.warn("XRAY_STORAGE_BACKEND=r2 but R2 credentials are missing. Falling back to local storage in development.")
      warnedR2Fallback = true
    }
    return "local"
  }

  return "r2"
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const bucketName = process.env.R2_BUCKET_NAME
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new StorageUnavailableError(
      "R2 storage is enabled but credentials are missing. Configure R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    )
  }

  return {
    bucketName,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  }
}

function getR2Client() {
  if (cachedClient) return cachedClient
  const { endpoint, credentials } = getR2Config()
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials,
  })
  return cachedClient
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  if (!body) return Buffer.alloc(0)
  if (body instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray()
    return Buffer.from(bytes)
  }

  throw new Error("Unsupported stream body type")
}

function toLocalObjectPath(key: string) {
  return path.join(LOCAL_OBJECT_ROOT, key)
}

async function ensureLocalObjectDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function readLocalBuffer(filePath: string) {
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

async function readR2Buffer(key: string) {
  try {
    const client = getR2Client()
    const { bucketName } = getR2Config()
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    return await streamToBuffer(result.Body)
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "name" in error &&
      (error as { name?: string }).name === "NoSuchKey"
    ) {
      return null
    }
    throw new StorageUnavailableError(`Failed to read object from R2: ${key}`)
  }
}

function resolveLocalBaseCandidates(asset: XRayAssetManifestItem) {
  const candidates: string[] = []

  if (asset.sourceType === "nih_kaggle_sample" && asset.file) {
    candidates.push(path.join(process.cwd(), "tmp", "xray", "nih-base", asset.file))
    candidates.push(path.join(process.cwd(), "tmp", "kaggle", "nih-sample", "images", asset.file))
  }

  if (asset.file) {
    candidates.push(path.join(process.cwd(), "public", "xray", "base", asset.file))
  }

  if (asset.storageKey) {
    candidates.push(toLocalObjectPath(asset.storageKey))
  }

  return candidates
}

function withDefaults(asset: XRayAssetManifestItem): XRayAssetManifestItem {
  return {
    ...asset,
    sourceType: asset.sourceType ?? "synthetic",
    sourceDataset: asset.sourceDataset ?? "synthetic",
    storageKey: asset.storageKey ?? (asset.file ? `xray/base/synthetic/${asset.file}` : undefined),
  }
}

export async function getBaseImageBuffer(assetInput: XRayAssetManifestItem): Promise<Buffer> {
  const asset = withDefaults(assetInput)
  const backend = getXRayStorageBackend()

  if (backend === "r2" && asset.storageKey) {
    const fromR2 = await readR2Buffer(asset.storageKey)
    if (fromR2) return fromR2
  }

  const localCandidates = resolveLocalBaseCandidates(asset)
  for (const candidate of localCandidates) {
    const localBuffer = await readLocalBuffer(candidate)
    if (localBuffer) return localBuffer
  }

  throw new Error(`Missing X-ray base image for asset ${asset.id}`)
}

export async function putGeneratedImage(key: string, buffer: Buffer) {
  const backend = getXRayStorageBackend()

  if (backend === "local") {
    const target = toLocalObjectPath(key)
    await ensureLocalObjectDir(target)
    await fs.writeFile(target, buffer)
    return
  }

  const client = getR2Client()
  const { bucketName } = getR2Config()
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
      })
    )
  } catch {
    throw new StorageUnavailableError(`Failed to write generated image to R2: ${key}`)
  }
}

export async function getGeneratedImage(key: string): Promise<Buffer | null> {
  if (getXRayStorageBackend() === "local") {
    return readLocalBuffer(toLocalObjectPath(key))
  }
  return readR2Buffer(key)
}

export async function putJsonObject(key: string, value: unknown) {
  const payload = Buffer.from(JSON.stringify(value, null, 2), "utf8")
  const backend = getXRayStorageBackend()

  if (backend === "local") {
    const target = toLocalObjectPath(key)
    await ensureLocalObjectDir(target)
    await fs.writeFile(target, payload)
    return
  }

  const client = getR2Client()
  const { bucketName } = getR2Config()
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: payload,
        ContentType: "application/json",
      })
    )
  } catch {
    throw new StorageUnavailableError(`Failed to write JSON object to R2: ${key}`)
  }
}

export async function getJsonObject<T>(key: string): Promise<T | null> {
  const backend = getXRayStorageBackend()

  if (backend === "local") {
    const raw = await readLocalBuffer(toLocalObjectPath(key))
    if (!raw) return null
    return JSON.parse(raw.toString("utf8")) as T
  }

  const raw = await readR2Buffer(key)
  if (!raw) return null
  return JSON.parse(raw.toString("utf8")) as T
}

export async function objectExists(key: string): Promise<boolean> {
  const backend = getXRayStorageBackend()
  if (backend === "local") {
    try {
      await fs.access(toLocalObjectPath(key))
      return true
    } catch {
      return false
    }
  }

  try {
    const client = getR2Client()
    const { bucketName } = getR2Config()
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    return true
  } catch (error) {
    if (typeof error === "object" && error && "name" in error && (error as { name?: string }).name === "NotFound") {
      return false
    }
    throw new StorageUnavailableError(`Failed to check object in R2: ${key}`)
  }
}

export async function deleteObjectByKey(key: string) {
  const backend = getXRayStorageBackend()
  if (backend === "local") {
    await fs.unlink(toLocalObjectPath(key)).catch(() => undefined)
    return
  }

  try {
    const client = getR2Client()
    const { bucketName } = getR2Config()
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
  } catch {
    throw new StorageUnavailableError(`Failed to delete object in R2: ${key}`)
  }
}

export async function listObjectsByPrefix(prefix: string, maxKeys = 500): Promise<string[]> {
  const backend = getXRayStorageBackend()
  if (backend === "local") {
    const root = toLocalObjectPath(prefix)
    try {
      const items = await fs.readdir(root)
      return items.slice(0, maxKeys).map((item) => path.posix.join(prefix, item))
    } catch {
      return []
    }
  }

  const client = getR2Client()
  const { bucketName } = getR2Config()
  const results: string[] = []
  let continuationToken: string | undefined

  while (results.length < maxKeys) {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: Math.min(1000, maxKeys - results.length),
        ContinuationToken: continuationToken,
      })
    )

    for (const item of response.Contents ?? []) {
      if (item.Key) results.push(item.Key)
    }

    if (!response.IsTruncated || !response.NextContinuationToken) break
    continuationToken = response.NextContinuationToken
  }

  return results
}

export async function ensureLocalStorageRoots() {
  if (getXRayStorageBackend() !== "local") return
  await fs.mkdir(LOCAL_GENERATED_ROOT, { recursive: true })
  await fs.mkdir(LOCAL_META_ROOT, { recursive: true })
}
