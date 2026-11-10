import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Analysis } from './ai-insights-types'

/** Seconds to wait before offering another try after the model API says it is busy. */
const RETRY_AFTER_SECONDS = 60

// sessionStorage never notifies changes we don't make ourselves — subscribe is a no-op
const emptySubscribe = () => () => {}

/**
 * The analysis for one period and comparison: read from this tab's session
 * cache when there is one, fetched on request otherwise.
 *
 * Results and in-flight status are keyed by `cacheKey`, so switching periods
 * mid-request cannot leak one period's state into another.
 *
 * @param body What the route needs to analyse; `force` is added per request.
 */
export function useSpendingAnalysis(cacheKey: string, body: object) {
  const abortRef = useRef<AbortController | null>(null)

  // Session cache read: null on the server and during hydration, the cached
  // JSON afterwards — hydration-safe without an effect
  const cachedRaw = useSyncExternalStore(
    emptySubscribe,
    () => sessionStorage.getItem(cacheKey),
    () => null,
  )
  const cached = useMemo<Analysis | null>(() => {
    if (!cachedRaw) return null
    try { return JSON.parse(cachedRaw) } catch { return null }
  }, [cachedRaw])

  const [fetched, setFetched] = useState<{ key: string; data: Analysis } | null>(null)
  const [request, setRequest] = useState<{ key: string; status: 'loading' | 'error' | 'rate_limit' } | null>(null)
  const [retryIn, setRetryIn] = useState(0)

  const analysis = fetched?.key === cacheKey ? fetched.data : cached
  const requestStatus = request?.key === cacheKey ? request.status : null
  const state: 'idle' | 'loading' | 'done' | 'error' | 'rate_limit' =
    requestStatus ?? (analysis ? 'done' : 'idle')

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (requestStatus !== 'rate_limit' || retryIn <= 0) return
    const t = setTimeout(() => {
      if (retryIn <= 1) { setRetryIn(0); setRequest(null) }
      else setRetryIn(retryIn - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [requestStatus, retryIn])

  function analyze(force = false) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const key = cacheKey
    setRequest({ key, status: 'loading' })

    fetch('/api/ai/spending-analysis', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, force }),
    })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (status === 429 || data.error === 'rate_limit') {
          setRetryIn(RETRY_AFTER_SECONDS); setRequest({ key, status: 'rate_limit' }); return
        }
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem(key, JSON.stringify(data))
        setFetched({ key, data })
        setRequest(null)
      })
      .catch(err => { if (err.name !== 'AbortError') setRequest({ key, status: 'error' }) })
  }

  return { analysis, state, retryIn, analyze }
}
