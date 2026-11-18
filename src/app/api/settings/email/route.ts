import { getTranslations } from 'next-intl/server'
import { NextResponse } from 'next/server'
import { withAuth, badRequest, authError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const { email } = await request.json()
  if (!email?.trim()) return badRequest('emailIsRequired')
  if (email.trim() === user.email) return badRequest('thisIsAlreadyYourCurrentEmail')

  const { error } = await supabase.auth.updateUser({ email: email.trim() })
  if (error) return authError(error)

  return NextResponse.json({ message: (await getTranslations('settings'))('confirmationEmailSent') })
})
