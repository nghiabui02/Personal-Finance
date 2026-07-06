import { NextResponse } from 'next/server'
import { withAuth, badRequest, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const { email } = await request.json()
  if (!email?.trim()) return badRequest('Email is required.')
  if (email.trim() === user.email) return badRequest('This is already your current email.')

  const { error } = await supabase.auth.updateUser({ email: email.trim() })
  if (error) return supabaseError(error)

  return NextResponse.json({ message: 'Confirmation email sent. Check your inbox.' })
})
