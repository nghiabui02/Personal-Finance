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
    return badRequest('Please fill in all fields.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return jsonError(401, 'Invalid email or password.')
  }

  return NextResponse.json({ success: true })
})
