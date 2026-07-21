import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest, tooManyRequests } from '@/lib/server/route'
import { isRateLimited } from '@/lib/server/rate-limit'

export const POST = withRoute(async (request) => {
  if (isRateLimited(request, { key: 'forgot-password', limit: 5, windowMs: 60 * 60 * 1000 })) {
    return tooManyRequests()
  }

  const { email } = await request.json()

  if (!email) {
    return badRequest('Email is required.')
  }

  const origin = new URL(request.url).origin
  const supabase = await createClient()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Always return success — don't reveal whether the email exists
  return NextResponse.json({ success: true })
})
