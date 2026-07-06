import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRoute, badRequest } from '@/lib/server/route'

export const POST = withRoute(async (request) => {
  const { email, password } = await request.json()

  if (!email || !password) {
    return badRequest('Please fill in all fields.')
  }
  if (password.length < 6) {
    return badRequest('Password must be at least 6 characters.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return badRequest(error.message)
  }

  return NextResponse.json({ message: 'check_email' })
})
