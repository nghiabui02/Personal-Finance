import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest, jsonError } from '@/lib/server/route'

export const POST = withRoute(async (request) => {
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
