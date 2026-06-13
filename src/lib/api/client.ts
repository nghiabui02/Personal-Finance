export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 204) return null as T

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
  }

  return body as T
}
