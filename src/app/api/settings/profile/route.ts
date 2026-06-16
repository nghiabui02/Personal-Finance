import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data.user })
}
