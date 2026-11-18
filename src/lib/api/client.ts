import { clientTranslator } from '@/i18n/client'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const t = clientTranslator('errors')
  let res: Response
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, t('network'))
  }

  if (res.status === 204) return null as T

  const body = await res.json().catch(() => ({}))

  if (res.status === 401) {
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {})
    window.location.href = '/login'
    throw new ApiError(401, t('sessionExpired'))
  }

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? t('requestFailed', { status: res.status }))
  }

  return body as T
}
