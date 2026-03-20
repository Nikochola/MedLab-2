import { NextResponse } from "next/server"
import { listRecentCachedPayloads } from "@/lib/xray/cache"
import type { XRayGenerateResponse } from "@/lib/xray/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const payloads = await listRecentCachedPayloads(400)
    const recent = payloads.filter((item) => Date.now() - item.payload.createdAt <= ONE_DAY_MS)

    const items: Array<{
      requestId: string
      generatedAt: string
      pathology: string
      severity: string
      view: string
      cacheHit: boolean
      generationMs: number
      rejectedSamples: number
      imageCount: number
    }> = []

    for (const { payload } of recent) {
      const response = payload.response as XRayGenerateResponse
      if (!response || response.provenance.length === 0) continue

      const p = response.provenance[0]
      items.push({
        requestId: response.requestId,
        generatedAt: response.generatedAt,
        pathology: p.pathology,
        severity: p.severity,
        view: p.view,
        cacheHit: response.cacheHit,
        generationMs: response.metrics.generationMs,
        rejectedSamples: response.metrics.rejectedSamples,
        imageCount: response.images.length,
      })
    }

    const summary = items.reduce(
      (acc, item) => {
        acc.total += 1
        acc.byPathology[item.pathology] = (acc.byPathology[item.pathology] ?? 0) + 1
        acc.bySeverity[item.severity] = (acc.bySeverity[item.severity] ?? 0) + 1
        acc.byView[item.view] = (acc.byView[item.view] ?? 0) + 1
        return acc
      },
      {
        total: 0,
        byPathology: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byView: {} as Record<string, number>,
      }
    )

    return NextResponse.json({ summary, items })
  } catch (error) {
    console.error("xray.qa.daily.error", error)
    return NextResponse.json({ error: "Failed to read QA samples" }, { status: 500 })
  }
}
