import { NextResponse } from 'next/server'
import { withRoute, badRequest, supabaseError } from '@/lib/server/route'
import { createClient } from '@/lib/supabase/server'
import { LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, type Locale } from '@/i18n/locale'

export const PATCH = withRoute(async request => {
  const body = await request.json()
  const locale = body?.locale
  if (!LOCALES.includes(locale as Locale)) return badRequest('invalidLanguage')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { error } = await supabase.auth.updateUser({ data: { locale } })
    if (error) return supabaseError(error)
  }
  const response = NextResponse.json({ locale })
  response.cookies.set(LOCALE_COOKIE, locale, {
    ...LOCALE_COOKIE_OPTIONS, secure: request.nextUrl.protocol === 'https:',
  })
  return response
})
