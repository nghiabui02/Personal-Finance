import { authErrorKey } from '@/i18n/auth-error'
import { getTranslations } from 'next-intl/server'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type ServerClient = Awaited<ReturnType<typeof createClient>>

type AuthedContext<P> = {
  supabase: ServerClient
  user: User
  params: P
}

export async function jsonError(status: number, message: string, values?: Record<string, string | number>): Promise<NextResponse> {
  const t = await getTranslations('errors')
  return NextResponse.json({ error: t.has(message) ? t(message, values) : message }, { status })
}

export const badRequest = (message: string) => jsonError(400, message)
const unauthorized = () => jsonError(401, "unauthorized")
export const notFound = (message = "notFound") => jsonError(404, message)
export const conflict = (message: string) => jsonError(409, message)
export const tooManyRequests = (message = "tooManyAttemptsPleaseTryAgainLater") => jsonError(429, message)

// For Supabase/PostgREST errors that reach the response: log for debugging,
// show a safe localized fallback while retaining diagnostics on the server.
export function supabaseError(error: { message: string; code?: string }): Promise<NextResponse> {
  console.error('[api] supabase error:', error.code ?? '', error.message)
  return jsonError(500, 'internalServerError')
}

/**
 * The money functions raise their user-facing refusals — not enough in the
 * wallet, more than the debt still owes — with SQLSTATE P0001, and write the
 * sentence the user should read. Anything else is a fault on our side.
 */
export function rpcError(error: { message: string; code?: string }): Promise<NextResponse> | NextResponse {
  return error.code === 'P0001' ? NextResponse.json({ error: error.message }, { status: 400 }) : supabaseError(error)
}

export const noContent = () => new NextResponse(null, { status: 204 })

/**
 * Updating or deleting one row the caller owns.
 *
 * Row-level security already hides other people's rows; the `user_id` filter is
 * the second line behind it. Taking `userId` as a required argument means a
 * route cannot forget it.
 */
export async function updateOwnedRow(
  supabase: ServerClient,
  table: string,
  { id, userId }: { id: string; userId: string },
  patch: Record<string, unknown>,
  columns = '*',
): Promise<NextResponse> {
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(columns)
    .single()

  if (error) return supabaseError(error)
  return NextResponse.json(data)
}

export async function deleteOwnedRow(
  supabase: ServerClient,
  table: string,
  { id, userId }: { id: string; userId: string },
): Promise<NextResponse> {
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId)

  if (error) return supabaseError(error)
  return noContent()
}

// Wraps a route handler with the auth check every private route needs,
// resolves dynamic params, and turns uncaught errors into logged 500s
// instead of opaque crashes.
export function withAuth<P = Record<string, never>>(
  handler: (request: NextRequest, ctx: AuthedContext<P>) => Promise<Response>,
) {
  return async (request: NextRequest, routeCtx: { params: Promise<P> }): Promise<Response> => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorized()

    const params = await routeCtx.params

    try {
      return await handler(request, { supabase, user, params })
    } catch (err) {
      console.error(`[api] ${request.method} ${request.nextUrl.pathname} failed:`, err)
      if (err instanceof SyntaxError) return badRequest("invalidJsonBody")
      return jsonError(500, "internalServerError")
    }
  }
}

// Same error handling for routes that must work without a session
// (sign-in, sign-up, password recovery).
export function withRoute(
  handler: (request: NextRequest) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      return await handler(request)
    } catch (err) {
      console.error(`[api] ${request.method} ${request.nextUrl.pathname} failed:`, err)
      if (err instanceof SyntaxError) return badRequest("invalidJsonBody")
      return jsonError(500, "internalServerError")
    }
  }
}

export function authError(error: { message: string; code?: string }): Promise<NextResponse> {
  console.error('[api] auth operation failed:', error.code ?? 'unknown')
  return jsonError(400, authErrorKey(error.code))
}
