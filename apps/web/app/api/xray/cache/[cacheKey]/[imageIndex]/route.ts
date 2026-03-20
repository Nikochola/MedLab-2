import { NextRequest, NextResponse } from "next/server"
import { readCacheImage, signCacheImage } from "@/lib/xray/cache"

export const runtime = "nodejs"

const CACHE_KEY_REGEX = /^[a-f0-9]{20}$/

export async function GET(
  request: NextRequest,
  { params }: { params: { cacheKey: string; imageIndex: string } }
) {
  const { cacheKey, imageIndex } = params

  if (!CACHE_KEY_REGEX.test(cacheKey)) {
    return NextResponse.json({ error: "Invalid cache key" }, { status: 400 })
  }

  const index = Number.parseInt(imageIndex, 10)
  if (!Number.isFinite(index) || index < 0 || index > 10) {
    return NextResponse.json({ error: "Invalid image index" }, { status: 400 })
  }

  const signature = request.nextUrl.searchParams.get("s")
  const expectedSignature = signCacheImage(cacheKey, index)
  if (!signature || signature !== expectedSignature) {
    return NextResponse.json({ error: "Invalid image signature" }, { status: 403 })
  }

  const image = await readCacheImage(cacheKey, index)
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(image), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=300",
    },
  })
}
