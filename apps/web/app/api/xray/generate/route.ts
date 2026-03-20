import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  assertCacheMissLimit,
  assertRateLimit,
  createRequestId,
  getSignedCacheImageUrl,
  normalizeRequest,
  purgeOldCacheEntries,
  readCachedPayload,
  writeCachedImage,
  writeCachedPayload,
} from "@/lib/xray/cache"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"
import { generateXRayImage } from "@/lib/xray/generator"
import type { XRayGenerateRequest, XRayGenerateResponse } from "@/lib/xray/types"
import { XRAY_WARNING_TEXT } from "@/lib/xray/types"
import { StorageUnavailableError } from "@/lib/xray/storage"

export const runtime = "nodejs"

// Handling Cloudflare R2
const r2AccountId = process.env.R2_ACCOUNT_ID
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const r2BucketName = process.env.R2_BUCKET_NAME || "medlab-xray"

const s3Client = (r2AccountId && r2AccessKeyId && r2SecretAccessKey)
  ? new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })
  : null

function isValidView(value: unknown): value is XRayGenerateRequest["view"] {
  return value === "PA" || value === "AP"
}

function isValidPathology(value: unknown): value is XRayGenerateRequest["pathology"] {
  return (
    value === "normal" ||
    value === "pneumonia" ||
    value === "pleural_effusion" ||
    value === "pneumothorax" ||
    value === "cardiomegaly"
  )
}

function isValidSeverity(value: unknown): value is XRayGenerateRequest["severity"] {
  return value === "mild" || value === "moderate" || value === "severe"
}

function isValidSource(value: unknown): value is XRayGenerateRequest["source"] {
  return value === undefined || value === "synthetic" || value === "real"
}

function getRateLimitKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")
  return forwardedFor || realIp || "anonymous"
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()

  try {
    const body = (await request.json()) as Partial<XRayGenerateRequest>

    if (!isValidView(body.view) || !isValidPathology(body.pathology) || !isValidSeverity(body.severity) || !isValidSource(body.source)) {
      return NextResponse.json(
        {
          error: "Invalid request. Expected view/pathology/severity/source in allowed enum values.",
        },
        { status: 400 }
      )
    }

    const normalized = normalizeRequest({
      view: body.view,
      pathology: body.pathology,
      severity: body.severity,
      seed: body.seed,
      count: body.count,
      source: body.source,
    })

    const requestId = createRequestId(normalized)
    const rateKey = getRateLimitKey(request)
    const rateResult = assertRateLimit(rateKey)

    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for X-ray generation.",
          retryAfterSeconds: rateResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.retryAfterSeconds),
          },
        }
      )
    }

    // Handle Real Clinical Images
    if (normalized.source === "real") {
      const supabaseAdmin = createSupabaseAdminClient()

      // Determine modality from request or default to XRAY
      const requestedModality = body.modality === "CT" ? "CT" : "XRAY"

      // Get random images matching the pathology and modality from the training set
      // Always filter for ADULT age group as requested
      const { data: dbImages, error: dbError } = await supabaseAdmin
        .from("xray_training_images")
        .select("*")
        .eq("label", normalized.pathology)
        .eq("modality", requestedModality)
        .eq("age_group", "ADULT")
        .limit(10)

      if (dbError || !dbImages || dbImages.length === 0) {
        console.warn("Real images requested but not found, falling back to synthetic", normalized.pathology)
      } else {
        const selected = dbImages.sort(() => 0.5 - Math.random()).slice(0, normalized.count)

        const signedImages = await Promise.all(selected.map(async (img) => {
          let url = ""

          if (img.storage_provider === "r2" && s3Client) {
            try {
              url = await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: r2BucketName,
                  Key: img.storage_path,
                }),
                { expiresIn: 3600 }
              )
            } catch (err) {
              console.error("R2 signing failed", err)
            }
          } else {
            const { data } = await supabaseAdmin.storage
              .from("xray-datasets")
              .createSignedUrl(img.storage_path, 3600)
            url = data?.signedUrl || ""
          }

          return {
            url: url,
            width: 1024,
            height: 1024,
            provenance: {
              seed: img.id,
              sourceType: "real_clinical" as const,
              sourceDataset: img.dataset_source,
              pathology: img.label as any,
              severity: "moderate" as const,
              warningText: XRAY_WARNING_TEXT,
              diagnosticUse: false as const,
              operations: [],
              markers: []
            }
          }
        }))

        const response: XRayGenerateResponse = {
          requestId: `real-${requestId}`,
          images: signedImages.map(si => ({ url: si.url, width: si.width, height: si.height })),
          provenance: signedImages.map(si => si.provenance as any),
          cacheHit: false,
          generatedAt: new Date().toISOString(),
          metrics: {
            generationMs: Date.now() - startedAt,
            rejectedSamples: 0,
          },
          diagnosticUse: false,
          warningText: XRAY_WARNING_TEXT,
        }

        return NextResponse.json(response)
      }
    }

    // Fallback or explicit synthetic flow
    await purgeOldCacheEntries()

    const cached = await readCachedPayload(requestId)
    if (cached) {
      const cacheHitResponse: XRayGenerateResponse = {
        ...cached.response,
        cacheHit: true,
      }

      console.info(
        JSON.stringify({
          event: "xray.generate",
          requestId,
          cacheHit: true,
          pathology: normalized.pathology,
          severity: normalized.severity,
          view: normalized.view,
          source: normalized.source,
          latencyMs: Date.now() - startedAt,
        })
      )

      return NextResponse.json(cacheHitResponse)
    }

    const missLimit = assertCacheMissLimit(rateKey)
    if (!missLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many uncached X-ray generation requests. Please retry shortly.",
          retryAfterSeconds: missLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(missLimit.retryAfterSeconds),
          },
        }
      )
    }

    const generated = [] as Awaited<ReturnType<typeof generateXRayImage>>[]

    for (let i = 0; i < normalized.count; i += 1) {
      generated.push(
        await generateXRayImage({
          ...normalized,
          seed: normalized.seed + i * 101,
          count: 1,
        })
      )
    }

    const imageFiles: string[] = []

    for (let i = 0; i < generated.length; i += 1) {
      const { fileName } = await writeCachedImage(requestId, i, generated[i].pngBuffer)
      imageFiles.push(fileName)
    }

    const generationMs = Date.now() - startedAt
    const rejectedSamples = generated.reduce((sum, item) => sum + item.rejectedSamples, 0)

    const response: XRayGenerateResponse = {
      requestId,
      images: generated.map((item, index) => ({
        url: getSignedCacheImageUrl(requestId, index),
        width: item.width,
        height: item.height,
      })),
      provenance: generated.map((item) => item.provenance),
      cacheHit: false,
      generatedAt: new Date().toISOString(),
      metrics: {
        generationMs,
        rejectedSamples,
      },
      diagnosticUse: false,
      warningText: XRAY_WARNING_TEXT,
    }

    await writeCachedPayload(requestId, {
      response,
      imageFiles,
      createdAt: Date.now(),
    })

    console.info(
      JSON.stringify({
        event: "xray.generate",
        requestId,
        cacheHit: false,
        pathology: normalized.pathology,
        severity: normalized.severity,
        view: normalized.view,
        source: normalized.source,
        latencyMs: generationMs,
        rejectedSamples,
      })
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error("xray.generate.error", error)
    if (error instanceof StorageUnavailableError) {
      return NextResponse.json(
        {
          error: "X-ray storage backend unavailable",
          detail: error.message,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Failed to generate X-ray image" }, { status: 500 })
  }
}
