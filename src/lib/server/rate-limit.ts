import { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// In-memory fixed-window limiter — a first line of defense in front of
// Supabase Auth's own rate limits. State is per server instance and resets
// on cold start, so treat this as best-effort under serverless autoscaling,
// not a hard guarantee.
const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

function pruneExpired(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

// Returns true when the caller has exceeded `limit` requests to `key`
// within the trailing `windowMs`, keyed per client IP.
export function isRateLimited(
  request: NextRequest,
  opts: { key: string; limit: number; windowMs: number },
): boolean {
  const now = Date.now()
  pruneExpired(now)

  const bucketKey = `${opts.key}:${clientIp(request)}`
  const bucket = buckets.get(bucketKey)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > opts.limit
}
