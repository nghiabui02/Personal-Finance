import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const { currentPassword, password, confirmPassword } = await request.json()

  if (!currentPassword) return badRequest('Current password is required.')
  if (!password) return badRequest('New password is required.')
  if (password.length < 6) return badRequest('Password must be at least 6 characters.')
  if (password !== confirmPassword) return badRequest('Passwords do not match.')
  if (password === currentPassword) return badRequest('New password must be different from the current password.')

  // Verify the current password by re-authenticating — Supabase has no
  // dedicated verify endpoint; a failed sign-in means the password is wrong
  // and a successful one just refreshes the same user's session.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: currentPassword,
  })
  if (verifyError) return badRequest('Current password is incorrect.')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return supabaseError(error)

  return NextResponse.json({ message: 'Password updated successfully.' })
})
