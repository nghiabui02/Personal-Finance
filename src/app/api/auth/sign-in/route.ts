import { getLocale } from 'next-intl/server'
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, normalizeLocale } from '@/i18n/locale'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest, jsonError, tooManyRequests } from '@/lib/server/route'
import { isRateLimited } from '@/lib/server/rate-limit'

export const POST = withRoute(async (request) => {
  if (isRateLimited(request, { key: 'sign-in', limit: 10, windowMs: 15 * 60 * 1000 })) {
    return tooManyRequests()
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return badRequest('pleaseFillInAllFields')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return jsonError(401, 'invalidEmailOrPassword')
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(LOCALE_COOKIE, normalizeLocale(data.user?.user_metadata.locale) ?? await getLocale(), {
    ...LOCALE_COOKIE_OPTIONS, secure: request.nextUrl.protocol === 'https:',
  })
  return response
})
