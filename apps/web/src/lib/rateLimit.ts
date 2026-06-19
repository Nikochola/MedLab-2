// Lightweight in-memory sliding-window rate limiter.
//
// Note: state is per-server-instance, so under multiple serverless instances the
// effective limit is N×. It still meaningfully caps single-source bursts (the
// abuse case) without external infra. Swap the store for Redis/Upstash if you
// need a globally-consistent limit later.

type Bucket = number[]

const windows = new Map<string, Bucket>()

let lastSweep = 0

function sweep(now: number) {
  // Periodically drop empty/expired buckets so the map doesn't grow unbounded.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const stale: string[] = []
  windows.forEach((hits, key) => {
    if (hits.length === 0 || now - hits[hits.length - 1] > 600_000) {
      stale.push(key)
    }
  })
  stale.forEach((key) => windows.delete(key))
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
}

/**
 * Allow up to `limit` events per `windowMs` for a given `key`.
 * Records the event when allowed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const hits = windows.get(key) ?? []
  const active = hits.filter((t) => now - t < windowMs)

  if (active.length >= limit) {
    const retryAfterMs = windowMs - (now - active[0])
    windows.set(key, active)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      remaining: 0,
    }
  }

  active.push(now)
  windows.set(key, active)
  return { allowed: true, retryAfterSeconds: 0, remaining: limit - active.length }
}

/** Best-effort client IP from proxy headers, for unauthenticated endpoints. */
export function clientIpFromRequest(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return fwd || request.headers.get("x-real-ip") || "anonymous"
}
