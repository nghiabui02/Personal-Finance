import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase }) => {
  const { password, confirmPassword } = await request.json()

  if (!password) return badRequest('Password is required.')
  if (password.length < 6) return badRequest('Password must be at least 6 characters.')
  if (password !== confirmPassword) return badRequest('Passwords do not match.')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return supabaseError(error)

  return NextResponse.json({ message: 'Password updated successfully.' })
})
