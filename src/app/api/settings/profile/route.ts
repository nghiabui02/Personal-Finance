import { NextResponse } from 'next/server'
import { withAuth, supabaseError } from '@/lib/server/route'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { full_name, phone, avatar_url } = body

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      ...(full_name !== undefined ? { full_name: full_name.trim() } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
      ...(avatar_url !== undefined ? { avatar_url } : {}),
    },
  })

  if (error) return supabaseError(error)
  return NextResponse.json({ user: data.user })
})
