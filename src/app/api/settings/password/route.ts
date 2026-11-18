import { getTranslations } from 'next-intl/server'
import { NextResponse } from 'next/server'
import { withAuth, badRequest, authError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const { currentPassword, password, confirmPassword } = await request.json()

  if (!currentPassword) return badRequest('currentPasswordIsRequired')
  if (!password) return badRequest('newPasswordIsRequired')
  if (password.length < 6) return badRequest('passwordMustBeAtLeast6Characters')
  if (password !== confirmPassword) return badRequest('passwordsDoNotMatch')
  if (password === currentPassword) return badRequest('newPasswordMustBeDifferentFromTheCurrentPassword')

  // Verify the current password by re-authenticating — Supabase has no
  // dedicated verify endpoint; a failed sign-in means the password is wrong
  // and a successful one just refreshes the same user's session.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: currentPassword,
  })
  if (verifyError) return badRequest('currentPasswordIsIncorrect')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return authError(error)

  return NextResponse.json({ message: (await getTranslations('settings'))('passwordUpdated') })
})
