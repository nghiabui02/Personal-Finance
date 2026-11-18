import { getLocale } from 'next-intl/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest, tooManyRequests, authError } from '@/lib/server/route'
import { isRateLimited } from '@/lib/server/rate-limit'

export const POST = withRoute(async (request) => {
  if (isRateLimited(request, { key: 'sign-up', limit: 5, windowMs: 60 * 60 * 1000 })) {
    return tooManyRequests()
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return badRequest('pleaseFillInAllFields')
  }
  if (password.length < 6) {
    return badRequest('passwordMustBeAtLeast6Characters')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { locale: await getLocale() },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return authError(error)
  }

  return NextResponse.json({ message: 'check_email' })
})
