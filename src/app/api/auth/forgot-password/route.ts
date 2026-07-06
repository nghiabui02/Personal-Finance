import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest } from '@/lib/server/route'

export const POST = withRoute(async (request) => {
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
